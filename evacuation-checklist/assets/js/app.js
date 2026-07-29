/**
 * 避難所持ち物チェックリスト — アプリ本体
 * -----------------------------------------------------------------------------
 * 設計メモ
 *
 * ・classic script（ES module ではない）で書いている。
 *   コーポレートサイト側は ES module 方式だが、このツールだけは意図的に外している。
 *   理由は、配布フォルダを file:// で直接開いたときに ES module が
 *   CORS で読み込めず、真っ白な画面になるため。
 *   停電・圏外の状況で「開いたけど動かない」は許容できない。
 *
 * ・外部ライブラリを一切使わない。CDN が引けない前提で作る。
 *
 * ・PDF保存は window.print() に寄せている。
 *   PDF生成ライブラリを積むと数百KBの追加ダウンロードが要るうえ、
 *   日本語フォントの埋め込みでさらに重くなる。
 *   ブラウザの印刷ダイアログの「PDFとして保存」なら、
 *   追加ダウンロードゼロ・日本語も確実に出る。
 *
 * ・保存は入力のたびに自動で行う。
 *   「保存ボタンを押し忘れて消えた」を、この状況の人に起こしてはいけない。
 */
(function (global, doc) {
  'use strict';

  var D = global.EvacData;
  if (!D) return;

  var STORAGE_KEY = 'evacuation-checklist:v1';
  var SAVE_DEBOUNCE = 400;

  /* ==========================================================================
     State
     ========================================================================== */
  var defaultState = function () {
    return {
      household: 'solo',
      conditions: {},        /* { baby: true, pet: true, ... } */
      counts: { people: 1, babies: 0, pets: 0, days: 3 },
      checked: {},           /* { itemId: true } */
      memo: { shelter: '', meeting: '', contacts: '', free: '' },
      hideChecked: false,
      updatedAt: null,
    };
  };

  var state = defaultState();

  /* ==========================================================================
     Storage
     プライベートブラウジングなどで localStorage が使えない環境がある。
     その場合もアプリは動き続けるべきなので、失敗は握りつぶして通知だけ出す。
     ========================================================================== */
  var storageAvailable = (function () {
    try {
      var k = '__evac_test__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  var load = function () {
    if (!storageAvailable) return;
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return;

      /* 保存データを丸ごと信用せず、既知のキーだけを取り込む。
         項目を追加・削除しても壊れないようにするため */
      if (typeof saved.household === 'string') state.household = saved.household;
      if (saved.conditions && typeof saved.conditions === 'object') {
        state.conditions = saved.conditions;
      }
      if (saved.counts && typeof saved.counts === 'object') {
        ['people', 'babies', 'pets', 'days'].forEach(function (k) {
          var v = Number(saved.counts[k]);
          if (isFinite(v)) state.counts[k] = clampCount(k, v);
        });
      }
      if (saved.checked && typeof saved.checked === 'object') state.checked = saved.checked;
      if (saved.memo && typeof saved.memo === 'object') {
        ['shelter', 'meeting', 'contacts', 'free'].forEach(function (k) {
          if (typeof saved.memo[k] === 'string') state.memo[k] = saved.memo[k];
        });
      }
      state.hideChecked = !!saved.hideChecked;
      state.updatedAt = saved.updatedAt || null;
    } catch (e) {
      /* 壊れたデータで起動不能になるくらいなら、初期状態で立ち上げる */
      console.warn('[checklist] 保存データを読み込めませんでした', e);
    }
  };

  var saveTimer = null;
  var save = function () {
    if (!storageAvailable) return;
    global.clearTimeout(saveTimer);
    saveTimer = global.setTimeout(function () {
      try {
        state.updatedAt = new Date().toISOString();
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderUpdatedAt();
      } catch (e) {
        console.warn('[checklist] 保存できませんでした', e);
        toast('保存できませんでした。端末の空き容量をご確認ください');
      }
    }, SAVE_DEBOUNCE);
  };

  var COUNT_RANGE = {
    people: [1, 20],
    babies: [0, 10],
    pets: [0, 10],
    days: [1, 14],
  };

  function clampCount(key, value) {
    var r = COUNT_RANGE[key] || [0, 99];
    return Math.min(r[1], Math.max(r[0], Math.round(value)));
  }

  /* ==========================================================================
     DOM ヘルパー
     ========================================================================== */
  var $ = function (sel, root) { return (root || doc).querySelector(sel); };

  /**
   * 要素を組み立てる。
   * textContent 経由でのみ文字を入れるため、データ側に記号が混ざっても安全。
   */
  function el(tag, attrs, children) {
    var node = doc.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  /* ==========================================================================
     選択状態 → 表示条件
     ========================================================================== */
  /**
   * いま有効な条件キーの集合を返す。
   * 'base' は常に含む。世帯タイプ自身もキーとして扱う（family 限定の項目があるため）。
   */
  function activeConditions() {
    var set = { base: true };
    set[state.household] = true;
    Object.keys(state.conditions).forEach(function (k) {
      if (state.conditions[k]) set[k] = true;
    });
    return set;
  }

  /** いま表示すべき持ち物だけを返す */
  function visibleItems() {
    var cond = activeConditions();
    return D.ITEMS.filter(function (item) {
      return item.when.some(function (key) { return !!cond[key]; });
    });
  }

  /** 数量計算に渡す人数まわりの値 */
  function countContext() {
    return {
      people: state.counts.people,
      babies: state.counts.babies,
      pets: state.counts.pets,
      days: state.counts.days,
    };
  }

  /* ==========================================================================
     Render / チェックリスト本体
     ========================================================================== */
  var listRoot = null;

  function renderList() {
    var items = visibleItems();
    var ctx = countContext();

    listRoot.textContent = '';

    D.PRIORITIES.forEach(function (pri) {
      var inPri = items.filter(function (i) { return i.pri === pri.key; });
      if (inPri.length === 0) return;

      var head = el('div', { class: 'p-group__head', 'data-pri': pri.key }, [
        el('span', { class: 'p-group__badge', text: pri.short }),
        el('h3', { class: 'p-group__title', text: pri.label }),
        el('p', { class: 'p-group__desc', text: pri.desc }),
      ]);

      var body = el('div', { class: 'p-group__body' });

      /* カテゴリ順は CATEGORIES の定義順に固定する。
         リストの並びが毎回変わると「さっき見た場所」を見失うため */
      D.CATEGORIES.forEach(function (cat) {
        var inCat = inPri.filter(function (i) { return i.cat === cat.key; });
        if (inCat.length === 0) return;

        var shown = inCat.filter(function (i) {
          return !(state.hideChecked && state.checked[i.id]);
        });
        if (shown.length === 0) return;

        var catNode = el('section', { class: 'p-cat' }, [
          el('h4', { class: 'p-cat__head' }, [
            el('span', { class: 'p-cat__icon', 'aria-hidden': 'true', text: cat.icon }),
            el('span', { text: cat.label }),
          ]),
        ]);

        var ul = el('ul', { class: 'p-cat__list' });
        shown.forEach(function (item) {
          ul.appendChild(renderItem(item, ctx));
        });

        catNode.appendChild(ul);
        body.appendChild(catNode);
      });

      listRoot.appendChild(el('section', { class: 'p-group' }, [head, body]));
    });

    renderProgress();
  }

  function renderItem(item, ctx) {
    var isChecked = !!state.checked[item.id];

    var input = el('input', {
      type: 'checkbox',
      class: 'p-item__check',
      id: 'item-' + item.id,
    });
    input.checked = isChecked;

    var name = el('span', { class: 'p-item__name', text: item.label });

    /* 数量は「1人3本」のように根拠ごと出す。
       数字だけ示されても、多いのか少ないのか判断できないため */
    if (typeof item.qty === 'function') {
      var qtyText = '';
      try {
        qtyText = item.qty(ctx);
      } catch (e) {
        qtyText = '';
      }
      if (qtyText) {
        name.appendChild(el('span', { class: 'p-item__qty', text: qtyText }));
      }
    }

    var body = el('span', { class: 'p-item__body' }, [name]);
    if (item.note) {
      body.appendChild(el('span', { class: 'p-item__note', text: item.note }));
    }

    var label = el('label', { class: 'p-item__label', for: 'item-' + item.id }, [input, body]);
    var li = el('li', { class: 'p-item' + (isChecked ? ' is-checked' : '') }, [label]);

    input.addEventListener('change', function () {
      if (input.checked) state.checked[item.id] = true;
      else delete state.checked[item.id];

      li.classList.toggle('is-checked', input.checked);
      save();

      /* 「残りだけ表示」中は、チェックした項目を消す＝リストを組み直す。
          それ以外は行のクラス切り替えだけで済ませ、
          スクロール位置とフォーカスを保つ */
      if (state.hideChecked && input.checked) renderList();
      else renderProgress();
    });

    return li;
  }

  /* ==========================================================================
     Render / 進捗
     ========================================================================== */
  var progressFill = null;
  var progressCount = null;
  var progressLabel = null;

  function renderProgress() {
    var items = visibleItems();
    var total = items.length;
    var done = items.filter(function (i) { return state.checked[i.id]; }).length;
    var percent = total === 0 ? 0 : Math.round((done / total) * 100);

    progressFill.style.width = percent + '%';
    progressFill.classList.toggle('is-complete', total > 0 && done === total);
    progressCount.textContent = done + ' / ' + total;

    /* 未チェックの 0次（いま持って出る）が残っているかで文言を変える。
       急ぐべき時に「あと少しです」と言わない */
    var nowLeft = items.filter(function (i) {
      return i.pri === 'now' && !state.checked[i.id];
    }).length;

    var message;
    if (total === 0) message = '条件を選ぶとリストが表示されます';
    else if (done === total) message = 'すべて確認できました。落ち着いて避難してください';
    else if (nowLeft > 0) message = 'まず「いま10分で持って出る」を先に確認してください';
    else message = '急ぎの分は確認できました。残りは無理のない範囲で';

    progressLabel.textContent = message;

    var bar = progressFill.parentNode;
    bar.setAttribute('aria-valuenow', String(percent));
    bar.setAttribute('aria-valuetext', done + '件 / 全' + total + '件');
  }

  /* ==========================================================================
     Render / 世帯タイプ・条件・人数
     ========================================================================== */
  function renderHouseholds() {
    var wrap = $('.js-households');
    wrap.textContent = '';

    D.HOUSEHOLDS.forEach(function (h) {
      var id = 'household-' + h.key;
      var input = el('input', {
        type: 'radio',
        name: 'household',
        class: 'c-chip__input',
        id: id,
        value: h.key,
      });
      input.checked = state.household === h.key;

      input.addEventListener('change', function () {
        if (!input.checked) return;
        state.household = h.key;
        /* 世帯を選び直したら人数の初期値も合わせる。
           あとから手で増減できるので、あくまで出発点として */
        state.counts.people = clampCount('people', h.people);
        renderSteppers();
        renderList();
        save();
      });

      wrap.appendChild(el('div', { class: 'c-chip' }, [
        input,
        el('label', { class: 'c-chip__label', for: id, text: h.label }),
      ]));
    });
  }

  function renderConditions() {
    var wrap = $('.js-conditions');
    wrap.textContent = '';

    D.CONDITIONS.forEach(function (c) {
      var id = 'cond-' + c.key;
      var input = el('input', {
        type: 'checkbox',
        class: 'c-chip__input',
        id: id,
        value: c.key,
      });
      input.checked = !!state.conditions[c.key];

      input.addEventListener('change', function () {
        if (input.checked) state.conditions[c.key] = true;
        else delete state.conditions[c.key];

        /* 赤ちゃん・ペットは人数入力の出し分けに関わるので、
           ステッパーも作り直す */
        if (c.key === 'baby' || c.key === 'pet') {
          if (input.checked) {
            var target = c.key === 'baby' ? 'babies' : 'pets';
            if (state.counts[target] === 0) state.counts[target] = 1;
          }
          renderSteppers();
        }

        renderList();
        save();
      });

      wrap.appendChild(el('div', { class: 'c-chip' }, [
        input,
        el('label', { class: 'c-chip__label', for: id, text: c.label }),
      ]));
    });
  }

  /**
   * 人数・日数のステッパーを描く。
   * 数値キーボードを直接触らせず、±ボタンでも変えられるようにしている。
   */
  function renderSteppers() {
    var wrap = $('.js-steppers');
    wrap.textContent = '';

    var fields = [{ key: 'people', label: '人数（合計）' }];
    if (state.conditions.baby) fields.push({ key: 'babies', label: 'うち赤ちゃん' });
    if (state.conditions.pet) fields.push({ key: 'pets', label: 'ペットの数' });
    fields.push({ key: 'days', label: '何日分そなえる' });

    fields.forEach(function (f) {
      var range = COUNT_RANGE[f.key];
      var id = 'count-' + f.key;

      var input = el('input', {
        type: 'number',
        class: 'c-stepper__value',
        id: id,
        inputmode: 'numeric',
        min: String(range[0]),
        max: String(range[1]),
      });
      input.value = String(state.counts[f.key]);

      var minus = el('button', {
        type: 'button',
        class: 'c-stepper__btn',
        'aria-label': f.label + 'を1減らす',
        text: '−',
      });
      var plus = el('button', {
        type: 'button',
        class: 'c-stepper__btn',
        'aria-label': f.label + 'を1増やす',
        text: '＋',
      });

      var apply = function (value) {
        var next = clampCount(f.key, value);
        state.counts[f.key] = next;
        input.value = String(next);
        minus.disabled = next <= range[0];
        plus.disabled = next >= range[1];
        renderList();
        save();
      };

      minus.addEventListener('click', function () { apply(state.counts[f.key] - 1); });
      plus.addEventListener('click', function () { apply(state.counts[f.key] + 1); });

      /* 入力中は確定させない。「1」を消して「12」と打つ途中で
         勝手に最小値へ戻されるのを避ける */
      input.addEventListener('change', function () {
        var v = Number(input.value);
        apply(isFinite(v) ? v : state.counts[f.key]);
      });

      minus.disabled = state.counts[f.key] <= range[0];
      plus.disabled = state.counts[f.key] >= range[1];

      wrap.appendChild(el('div', { class: 'c-stepper' }, [
        el('label', { class: 'c-stepper__label', for: id, text: f.label }),
        el('div', { class: 'c-stepper__control' }, [minus, input, plus]),
      ]));
    });
  }

  /* ==========================================================================
     Render / メモ欄
     ========================================================================== */
  /**
   * 印刷用の複製へ内容を書き写す。
   * 入力欄は紙の上で内容が切れることがあるので、印刷では複製のほうを出す。
   */
  function syncMemoPrint(key) {
    var mirror = $('[data-memo-print="' + key + '"]');
    if (mirror) mirror.textContent = state.memo[key];
  }

  function initMemo() {
    Object.keys(state.memo).forEach(function (key) {
      var field = $('[data-memo="' + key + '"]');
      if (!field) return;
      field.value = state.memo[key];
      syncMemoPrint(key);
      field.addEventListener('input', function () {
        state.memo[key] = field.value;
        syncMemoPrint(key);
        save();
      });
    });
  }

  /* ==========================================================================
     Render / 最終更新
     ========================================================================== */
  function renderUpdatedAt() {
    var node = $('.js-updated');
    if (!node) return;

    if (!storageAvailable) {
      node.textContent = 'この端末では自動保存が使えません。印刷して紙で残してください';
      return;
    }
    if (!state.updatedAt) {
      node.textContent = 'この端末に自動保存されます';
      return;
    }

    var d = new Date(state.updatedAt);
    if (isNaN(d.getTime())) {
      node.textContent = 'この端末に自動保存されます';
      return;
    }
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    node.textContent =
      '最終保存 ' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ==========================================================================
     Toast
     ========================================================================== */
  var toastNode = null;
  var toastTimer = null;

  function toast(message) {
    if (!toastNode) return;
    toastNode.textContent = message;
    toastNode.classList.add('is-visible');
    global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () {
      toastNode.classList.remove('is-visible');
    }, 2600);
  }

  /* ==========================================================================
     操作ボタン
     ========================================================================== */
  function initActions() {
    /* 印刷 と PDF保存 は同じ window.print() を呼ぶ。
       ボタンを分けているのは、利用者が探す言葉が違うから。
       PDF側だけ、ダイアログでの操作を先に案内する */
    var print = $('.js-print');
    if (print) {
      print.addEventListener('click', function () { global.print(); });
    }

    var pdf = $('.js-pdf');
    if (pdf) {
      pdf.addEventListener('click', function () {
        toast('送信先で「PDFに保存」を選んでください');
        /* トーストを読む時間を作ってから印刷ダイアログを開く */
        global.setTimeout(function () { global.print(); }, 700);
      });
    }

    var hide = $('.js-hide-checked');
    if (hide) {
      hide.checked = state.hideChecked;
      hide.addEventListener('change', function () {
        state.hideChecked = hide.checked;
        renderList();
        save();
      });
    }

    var reset = $('.js-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        if (!global.confirm('チェックと入力内容をすべて消します。よろしいですか？')) return;
        state = defaultState();
        try {
          if (storageAvailable) global.localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* 消せなくても続行する */ }
        renderAll();
        toast('リセットしました');
      });
    }

    var uncheck = $('.js-uncheck');
    if (uncheck) {
      uncheck.addEventListener('click', function () {
        if (!global.confirm('チェックだけをすべて外します。よろしいですか？')) return;
        state.checked = {};
        renderList();
        save();
        toast('チェックを外しました');
      });
    }
  }

  /* ==========================================================================
     起動
     ========================================================================== */
  function renderAll() {
    renderHouseholds();
    renderConditions();
    renderSteppers();
    renderList();
    initMemoValues();
    renderUpdatedAt();
  }

  /* リセット後にメモ欄の表示だけを戻す（イベントは初回のみ登録済み） */
  function initMemoValues() {
    Object.keys(state.memo).forEach(function (key) {
      var field = $('[data-memo="' + key + '"]');
      if (field) field.value = state.memo[key];
      syncMemoPrint(key);
    });
  }

  function boot() {
    listRoot = $('.js-list');
    progressFill = $('.js-progress-fill');
    progressCount = $('.js-progress-count');
    progressLabel = $('.js-progress-label');
    toastNode = $('.js-toast');

    if (!listRoot || !progressFill) return;

    load();
    renderHouseholds();
    renderConditions();
    renderSteppers();
    renderList();
    initMemo();
    initActions();
    renderUpdatedAt();

    /* 印刷日を紙の上に残す。いつ時点のリストかが後で分かるように */
    var printedAt = $('.js-printed-at');
    if (printedAt) {
      var now = new Date();
      printedAt.textContent =
        now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 時点';
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window, document);
