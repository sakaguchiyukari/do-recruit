/**
 * Do.Link — リファラル採用ページ
 * -----------------------------------------------------------------------------
 * 構成（上から順に）
 *   1. 求人データ（サンプル）
 *   2. 定数・ラベル定義
 *   3. ユーティリティ
 *   4. マッチング（スコア計算）
 *   5. 検索・描画
 *   6. 条件パネル（SP開閉）
 *   7. 詳細モーダル・紹介フォーム
 *   8. ドロワーメニュー
 *   9. フェードイン（IntersectionObserver）
 *  10. SP固定CTA
 *  11. パスワードゲート
 *  12. 初期化
 *
 * file:// で直接開いても動くよう、ESモジュールではなく defer の単一ファイル構成にしている。
 * グローバル変数を作らないよう、全体をブロックスコープで囲む。
 */
{
  /* ===========================================================================
     1. 求人データ（サンプル）
     ---------------------------------------------------------------------------
     ※ 部署名・内容はすべて画面確認用のサンプル。
     本番では API / スプレッドシート等から同じ形のデータを取得して差し替える。

     id, title, dept, category, summary, description,
     jobType, employment, area, bonus,
     postedAt(YYYY-MM-DD), deadline(YYYY-MM-DD | null=随時)
     ======================================================================== */
  const JOBS = [
    {
      id: 'R-001',
      title: 'ドコモショップ スタッフ',
      dept: 'ICT事業｜店舗運営部門',
      category: 'ict',
      summary: 'スマートフォンの販売や料金プランのご案内を通じて、地域のお客様の暮らしを支えるお仕事です。',
      description: '来店されたお客様への機種・料金プランのご案内、各種手続き、スマホ教室の運営などを担当します。\n接客・販売の経験がある方は特に歓迎します。',
      jobType: 'sales',
      employment: 'fulltime',
      area: 'kumamoto-city',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-10-14',
      deadline: null,
    },
    {
      id: 'R-002',
      title: '自動車整備士',
      dept: 'カーライフ事業｜整備部門',
      category: 'car',
      summary: '車検・点検・一般整備を担当。資格取得支援もあり、経験を活かして長く働ける環境です。',
      description: '車検・法定点検・一般整備・故障診断を担当します。\n自動車整備士資格（2級以上）をお持ちの方を想定しています。',
      jobType: 'mechanic',
      employment: 'fulltime',
      area: 'kumamoto-city',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-10-08',
      deadline: null,
    },
    {
      id: 'R-003',
      title: 'カーライフアドバイザー（新車・中古車販売）',
      dept: 'カーライフ事業｜販売部門',
      category: 'car',
      summary: 'お客様のライフスタイルに合ったクルマ選びをサポートし、購入後もながく伴走する営業職です。',
      description: '店頭でのご提案・商談、納車手続き、ご購入後の点検案内などを担当します。\n業界未経験でも、営業・接客経験がある方を歓迎します。',
      jobType: 'sales',
      employment: 'fulltime',
      area: 'kumamoto-other',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-10-02',
      deadline: '2026-12-25',
    },
    {
      id: 'R-004',
      title: 'ゴルフ場 フロント・レストランスタッフ',
      dept: 'ゴルフ事業｜コース運営',
      category: 'golf',
      summary: 'ご来場のお客様をお迎えするフロント業務と、クラブハウス内レストランでの接客を担当します。',
      description: 'チェックイン・精算などのフロント業務と、レストランでのホール接客をお願いします。',
      jobType: 'service',
      employment: 'parttime',
      area: 'kumamoto-other',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-09-29',
      deadline: '2026-10-27',
    },
    {
      id: 'R-005',
      title: 'コース管理スタッフ',
      dept: 'ゴルフ事業｜コース管理',
      category: 'golf',
      summary: '芝の手入れや設備の保守を通じて、最高のコンディションでお客様をお迎えするお仕事です。',
      description: '芝刈り・散水・施肥などのコース整備、管理機械の点検を担当します。\n屋外作業や機械操作の経験がある方を歓迎します。',
      jobType: 'mechanic',
      employment: 'contract',
      area: 'kumamoto-other',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-09-20',
      deadline: null,
    },
    {
      id: 'R-006',
      title: '介護職員（デイサービス）',
      dept: 'ライフ&ウェルネス事業｜介護部門',
      category: 'wellness',
      summary: '日中の生活支援やレクリエーションを通じて、利用者さまの「その人らしい毎日」を支えます。',
      description: '入浴・食事などの生活支援、送迎、レクリエーションの企画・運営を担当します。\n資格をお持ちでない方も、取得支援制度があります。',
      jobType: 'care',
      employment: 'contract',
      area: 'kumamoto-city',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-10-10',
      deadline: null,
    },
    {
      id: 'R-007',
      title: '社内SE（グループ情報システム）',
      dept: 'グループ本部｜情報システム',
      category: 'corporate',
      summary: 'グループ各社の業務システム・ネットワークの運用と、DX推進プロジェクトを担当します。',
      description: '社内ヘルプデスク、PC・ネットワーク管理、業務システムの導入支援を担当します。\nインフラ運用またはシステム開発の実務経験がある方を想定しています。',
      jobType: 'engineer',
      employment: 'fulltime',
      area: 'kumamoto-city',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-10-16',
      deadline: '2026-12-31',
    },
    {
      id: 'R-008',
      title: '経理・総務スタッフ',
      dept: 'グループ本部｜管理部門',
      category: 'corporate',
      summary: 'グループ会社の経理処理や総務業務を担当。バックオフィスから事業の成長を支えます。',
      description: '伝票処理、支払・請求業務、備品管理などを担当します。\n会計ソフトの使用経験がある方歓迎です。',
      jobType: 'office',
      employment: 'fulltime',
      area: 'kumamoto-city',
      bonus: 'あり（制度規程に準ずる）',
      postedAt: '2026-09-25',
      deadline: null,
    },
  ];


  /* ===========================================================================
     2. 定数・ラベル定義
     ======================================================================== */
  const LABELS = {
    category: {
      ict: 'インフォメーション&コミュニケーション事業',
      car: 'カーライフ事業',
      golf: 'ゴルフ事業',
      wellness: 'ライフ&ウェルネス事業',
      corporate: 'グループ本部・管理部門',
    },
    jobType: {
      sales: '営業・販売',
      service: '接客・サービス',
      engineer: 'IT・エンジニア',
      mechanic: '整備・技術職',
      care: '介護・医療',
      office: '事務・管理',
    },
    employment: { fulltime: '正社員', contract: '契約社員', parttime: 'パート・アルバイト' },
    area: { 'kumamoto-city': '熊本市内', 'kumamoto-other': '熊本県内（市外）' },
  };

  /** マッチングの配点（合計100。未入力の条件は分母から除外する） */
  const WEIGHT = { jobTypes: 50, employment: 25, area: 25 };

  /** 「マッチ度○%以上のみ表示」のしきい値 */
  const MATCH_THRESHOLD = 50;

  /** 締切が近いと判定する日数 */
  const SOON_DAYS = 7;

  /** stagger の上限（大量表示時に最後のカードが遅れすぎないようにする） */
  const STAGGER_MAX = 6;

  const DESKTOP_QUERY = window.matchMedia('(min-width: 1024px)');
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (REDUCED_MOTION.matches ? 'auto' : 'smooth');


  /* ===========================================================================
     3. ユーティリティ
     ======================================================================== */

  /** 今日の0時（締切判定用） */
  const today = (() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  /** 'YYYY-MM-DD' をローカル時刻の Date に変換する（UTC解釈によるズレを防ぐ） */
  const parseDate = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  /** 締切までの日数（締切なしは Infinity） */
  const daysLeft = (job) =>
    job.deadline ? Math.round((parseDate(job.deadline) - today) / 86400000) : Infinity;

  /** 募集中か（締切日当日までは募集中） */
  const isOpen = (job) => daysLeft(job) >= 0;

  /** 表示用の日付 'YYYY.MM.DD' */
  const formatDate = (value) => value.replaceAll('-', '.');

  /** 検索用の正規化（全角英数→半角、大文字→小文字） */
  const normalize = (text) => text.normalize('NFKC').toLowerCase().trim();

  /** テキストを持つ要素を生成する（innerHTML を使わず XSS を防ぐ） */
  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };


  /* ===========================================================================
     4. マッチング（スコア計算）
     ---------------------------------------------------------------------------
     入力された条件のみで満点を計算し、0〜100 に正規化する。
     条件が1つも入力されていない場合は null（マッチ度を表示しない）。
     ======================================================================== */
  const calcScore = (job, criteria) => {
    let total = 0;
    let earned = 0;

    if (criteria.jobTypes.length) {
      total += WEIGHT.jobTypes;
      if (criteria.jobTypes.includes(job.jobType)) earned += WEIGHT.jobTypes;
    }

    if (criteria.employment) {
      total += WEIGHT.employment;
      if (criteria.employment === job.employment) earned += WEIGHT.employment;
    }

    if (criteria.area) {
      total += WEIGHT.area;
      if (criteria.area === job.area) earned += WEIGHT.area;
    }

    return total ? Math.round((earned / total) * 100) : null;
  };


  /* ===========================================================================
     5. 検索・描画
     ======================================================================== */
  const form = document.querySelector('.js-filter-form');
  const list = document.querySelector('.js-result-list');
  const template = document.getElementById('job-card-template');
  const sortSelect = document.querySelector('.js-sort');
  const emptyBox = document.querySelector('.js-empty');
  const countTargets = document.querySelectorAll('.js-result-count, .js-result-count-apply');
  const activeCount = document.querySelector('.js-active-count');

  /** フォームの現在値を条件オブジェクトにする */
  const readCriteria = () => {
    const data = new FormData(form);
    return {
      keyword: normalize(data.get('keyword') || ''),
      category: data.get('category') || '',
      jobTypes: data.getAll('jobTypes'),
      employment: data.get('employment') || '',
      area: data.get('area') || '',
      matchedOnly: data.get('matchedOnly') === '1',
      sort: sortSelect.value,
    };
  };

  /** 初期値から変更されている条件の数（SPの開閉ボタンに表示） */
  const countActive = (criteria) =>
    [criteria.keyword, criteria.category, criteria.employment, criteria.area, criteria.matchedOnly]
      .filter(Boolean).length + criteria.jobTypes.length;

  /** キーワード検索の対象文字列 */
  const searchableText = (job) => normalize([
    job.title,
    job.dept,
    job.summary,
    job.description,
    LABELS.category[job.category],
    LABELS.jobType[job.jobType],
    LABELS.employment[job.employment],
    LABELS.area[job.area],
  ].join(' '));

  /** 絞り込み（ハード条件）＋スコア付与＋並び替え */
  const search = (criteria) => {
    const sorters = {
      match: (a, b) => (b.score ?? -1) - (a.score ?? -1) || b.job.postedAt.localeCompare(a.job.postedAt),
      new: (a, b) => b.job.postedAt.localeCompare(a.job.postedAt),
      deadline: (a, b) => daysLeft(a.job) - daysLeft(b.job),
    };
    const words = criteria.keyword ? criteria.keyword.split(/\s+/) : [];

    return JOBS
      .filter(isOpen)
      .filter((job) => !criteria.category || job.category === criteria.category)
      .filter((job) => words.every((word) => searchableText(job).includes(word)))
      .map((job) => ({ job, score: calcScore(job, criteria) }))
      .filter(({ score }) => !criteria.matchedOnly || (score !== null && score >= MATCH_THRESHOLD))
      .sort(sorters[criteria.sort] || sorters.match);
  };

  /** 締切の表示 */
  const renderDeadline = (element, job) => {
    if (!job.deadline) {
      element.textContent = '随時募集';
      return;
    }
    const left = daysLeft(job);
    element.textContent = left <= SOON_DAYS
      ? `締切まであと${left}日`
      : `締切 ${formatDate(job.deadline)}`;
    element.classList.toggle('is-soon', left <= SOON_DAYS);
  };

  /** 初回描画が済んだか（カードの表示演出の切り替えに使う） */
  let hasRendered = false;

  /** 求人カードを1枚生成する */
  const createCard = ({ job, score }, index, criteria) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const slot = (name) => card.querySelector(`[data-slot="${name}"]`);

    card.style.setProperty('--i', String(Math.min(index, STAGGER_MAX)));
    // 初回はスクロール連動のフェードイン、条件変更後は短い入れ替え演出にする
    // （条件を変えるたびに一覧が消えて見えるのを防ぐ）
    card.classList.add(hasRendered ? 'is-fresh' : 'js-reveal');

    slot('category').textContent = LABELS.category[job.category];

    if (score !== null) {
      const scoreBox = slot('score');
      scoreBox.hidden = false;
      scoreBox.style.setProperty('--score', String(score));
      scoreBox.setAttribute('aria-label', `マッチ度 ${score}%`);
      slot('score-value').textContent = String(score);
    }

    slot('dept').textContent = job.dept;
    slot('title').textContent = job.title;
    slot('summary').textContent = job.summary;

    // 職種 / 雇用形態 / 勤務エリア（選択中の経験と一致した職種は強調）
    const jobTypeTag = createElement('li', 'c-job-card__meta-item', LABELS.jobType[job.jobType]);
    if (criteria.jobTypes.includes(job.jobType)) jobTypeTag.classList.add('is-hit');
    slot('meta').append(
      jobTypeTag,
      createElement('li', 'c-job-card__meta-item', LABELS.employment[job.employment]),
      createElement('li', 'c-job-card__meta-item', LABELS.area[job.area]),
    );

    renderDeadline(slot('deadline'), job);

    const more = slot('more');
    more.dataset.jobId = job.id;
    more.setAttribute('aria-label', `${job.title}の詳細を見る`);

    return card;
  };

  /** 検索して結果を描画する */
  const render = () => {
    const criteria = readCriteria();
    const results = search(criteria);

    const fragment = document.createDocumentFragment();
    results.forEach((result, index) => fragment.append(createCard(result, index, criteria)));
    list.replaceChildren(fragment);

    countTargets.forEach((element) => {
      element.textContent = String(results.length);
    });
    emptyBox.hidden = results.length > 0;

    const active = countActive(criteria);
    activeCount.hidden = active === 0;
    activeCount.textContent = String(active);

    if (!hasRendered) observeReveal(list.querySelectorAll('.js-reveal'));
    hasRendered = true;
  };


  /* ===========================================================================
     6. 条件パネル（SP開閉）
     ======================================================================== */
  const toggleButton = document.querySelector('.js-filter-toggle');
  const applyButton = document.querySelector('.js-filter-apply');

  const setPanelOpen = (isPanelOpen) => {
    form.classList.toggle('is-open', isPanelOpen);
    toggleButton.setAttribute('aria-expanded', String(isPanelOpen));
  };

  const initFilter = () => {
    toggleButton.addEventListener('click', () => {
      setPanelOpen(!form.classList.contains('is-open'));
    });

    // SP：結果を見るボタンでパネルを閉じて結果へ移動
    applyButton.addEventListener('click', () => {
      setPanelOpen(false);
      document.getElementById('results').scrollIntoView({ behavior: scrollBehavior() });
    });

    // 入力のたびに即時反映（キーワードは入力が落ち着いてから）
    let keywordTimer = 0;
    form.addEventListener('input', (event) => {
      if (event.target.name === 'keyword') {
        clearTimeout(keywordTimer);
        keywordTimer = setTimeout(render, 200);
        return;
      }
      render();
    });

    // Enter キーでページ遷移しないようにする
    form.addEventListener('submit', (event) => event.preventDefault());

    // reset イベントは値が戻る「前」に発火するため、次のタスクで反映する
    form.addEventListener('reset', () => setTimeout(render));

    // form 属性で関連付けた並び順は form の input イベントに乗らないため個別に監視
    sortSelect.addEventListener('change', render);

    document.querySelector('.js-empty-reset').addEventListener('click', () => form.reset());

    // PC幅に広がったら SP 用の開閉状態をリセット
    DESKTOP_QUERY.addEventListener('change', () => setPanelOpen(false));
  };


  /* ===========================================================================
     7. 詳細モーダル・紹介フォーム
     ======================================================================== */
  const modal = document.querySelector('.js-modal');
  const applyForm = modal.querySelector('.js-apply-form');
  const doneBox = modal.querySelector('.js-modal-done');
  let lastFocused = null;

  /** 詳細の項目（dt / dd） */
  const specItems = (job) => [
    ['職種', LABELS.jobType[job.jobType]],
    ['雇用形態', LABELS.employment[job.employment]],
    ['勤務エリア', LABELS.area[job.area]],
    ['紹介報奨金', job.bonus],
    ['掲載日', formatDate(job.postedAt)],
    ['締切', job.deadline ? formatDate(job.deadline) : '随時'],
  ];

  /** 入力欄に対応するエラー表示要素（aria-describedby の中の *-error） */
  const errorElementOf = (field) => {
    const ids = (field.getAttribute('aria-describedby') || '').split(' ');
    const errorId = ids.find((id) => id.endsWith('-error'));
    return errorId ? document.getElementById(errorId) : null;
  };

  /** ValidityState から日本語のエラーメッセージを作る */
  const messageOf = (field) => {
    const { validity } = field;
    if (validity.valueMissing) {
      if (field.type === 'checkbox') return 'チェックを入れてください';
      if (field.tagName === 'SELECT') return '選択してください';
      return '入力してください';
    }
    if (validity.typeMismatch && field.type === 'email') return 'メールアドレスの形式で入力してください';
    if (validity.patternMismatch) {
      if (field.name === 'employeeId') return '半角数字6桁で入力してください';
      if (field.type === 'tel') return 'ハイフンなしの半角数字（10〜11桁）で入力してください';
      return '入力形式が正しくありません';
    }
    if (validity.tooShort) return `${field.minLength}文字以上で入力してください（現在${field.value.length}文字）`;
    if (validity.tooLong) return `${field.maxLength}文字以内で入力してください`;
    return '';
  };

  /** 1項目を検証してエラー表示を更新する */
  const validateField = (field) => {
    const message = field.checkValidity() ? '' : messageOf(field);
    const errorElement = errorElementOf(field);
    if (errorElement) errorElement.textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  };

  const clearErrors = () => {
    applyForm.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
    applyForm.querySelectorAll('.c-form__error').forEach((element) => {
      element.textContent = '';
    });
  };

  const openModal = (job) => {
    lastFocused = document.activeElement;

    modal.querySelector('.js-modal-category').textContent = LABELS.category[job.category];
    modal.querySelector('.js-modal-dept').textContent = job.dept;
    modal.querySelector('.js-modal-title').textContent = job.title;
    modal.querySelector('.js-modal-desc').textContent = job.description;
    modal.querySelector('.js-modal-spec').replaceChildren(...specItems(job).flatMap(([term, value]) => [
      createElement('dt', 'c-modal__spec-term', term),
      createElement('dd', 'c-modal__spec-desc', value),
    ]));

    // フォームを初期化して表示
    applyForm.hidden = false;
    applyForm.dataset.jobId = job.id;
    applyForm.reset();
    clearErrors();
    doneBox.hidden = true;

    modal.showModal();
    modal.scrollTop = 0;
  };

  const initModal = () => {
    // カードの「詳しく見る」（動的に生成されるためイベント委譲）
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-job-id]');
      if (!button) return;
      const job = JOBS.find((item) => item.id === button.dataset.jobId);
      if (job) openModal(job);
    });

    modal.querySelectorAll('.js-modal-close').forEach((button) => {
      button.addEventListener('click', () => modal.close());
    });

    // 背景（::backdrop）クリックで閉じる
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.close();
    });

    // 閉じたら元のボタンへフォーカスを戻す
    modal.addEventListener('close', () => {
      if (lastFocused instanceof HTMLElement) lastFocused.focus();
    });

    // JS有効時は独自のエラー表示を使う（JS無効時はブラウザ標準の検証が働く）
    applyForm.noValidate = true;
    const fields = applyForm.querySelectorAll('input, select, textarea');

    // 一度エラーになった項目は、入力のたびに再検証して早くエラーを消す
    fields.forEach((field) => {
      field.addEventListener('blur', () => {
        if (field.value || field.hasAttribute('aria-invalid')) validateField(field);
      });
      field.addEventListener('input', () => {
        if (field.hasAttribute('aria-invalid')) validateField(field);
      });
    });

    applyForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const results = [...fields].map(validateField);
      if (results.includes(false)) {
        applyForm.querySelector('[aria-invalid="true"]').focus();
        return;
      }

      // TODO: 送信先確定後、ここで fetch 等により送信する
      //   const body = new FormData(applyForm);
      //   body.append('jobId', applyForm.dataset.jobId);
      //   await fetch(applyForm.action, { method: 'POST', body });
      applyForm.hidden = true;
      doneBox.hidden = false;
      doneBox.focus();
    });
  };


  /* ===========================================================================
     8. ドロワーメニュー
     ======================================================================== */
  const initDrawer = () => {
    const drawer = document.querySelector('.js-drawer');
    const toggle = document.querySelector('.js-drawer-toggle');
    if (!drawer || !toggle) return;

    const setOpen = (isDrawerOpen) => {
      drawer.hidden = !isDrawerOpen;
      toggle.setAttribute('aria-expanded', String(isDrawerOpen));
      toggle.setAttribute('aria-label', isDrawerOpen ? 'メニューを閉じる' : 'メニューを開く');
    };

    toggle.addEventListener('click', () => setOpen(drawer.hidden));

    // メニュー内のリンクを押したら閉じる（ページ内リンク対策）
    drawer.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    // Esc で閉じてボタンへフォーカスを戻す
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || drawer.hidden) return;
      setOpen(false);
      toggle.focus();
    });
  };


  /* ===========================================================================
     9. フェードイン（IntersectionObserver）
     ---------------------------------------------------------------------------
     発火は1回のみ。非対応環境・モーション削減時は即座に表示する。
     ======================================================================== */
  const revealObserver = 'IntersectionObserver' in window && !REDUCED_MOTION.matches
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    : null;

  /** 要素群をフェードインの監視対象に加える */
  const observeReveal = (targets) => {
    targets.forEach((element) => {
      if (revealObserver) revealObserver.observe(element);
      else element.classList.add('is-revealed');
    });
  };

  const initReveal = () => {
    const targets = document.querySelectorAll('main .js-reveal, footer .js-reveal');

    // 同じ親の中で順に遅延させる
    const counters = new Map();
    targets.forEach((element) => {
      const parent = element.parentElement;
      const index = counters.get(parent) ?? 0;
      element.style.setProperty('--i', String(Math.min(index, STAGGER_MAX)));
      counters.set(parent, index + 1);
    });

    observeReveal(targets);
  };


  /* ===========================================================================
     10. SP固定CTA
     ---------------------------------------------------------------------------
     ページ見出しを過ぎ、かつ条件パネルが画面外のときだけ表示する。
     ======================================================================== */
  const initSpCta = () => {
    const cta = document.querySelector('.js-sp-cta');
    const button = document.querySelector('.js-sp-cta-button');
    const hero = document.querySelector('.p-page-hero');
    const aside = document.querySelector('.p-jobs__aside');
    if (!cta || !button || !hero || !aside || !('IntersectionObserver' in window)) return;

    const visible = new Map([[hero, true], [aside, false]]);

    const update = () => {
      const show = !visible.get(hero) && !visible.get(aside);
      cta.classList.toggle('is-visible', show);
      cta.setAttribute('aria-hidden', String(!show));
      button.tabIndex = show ? 0 : -1;
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
      update();
    });
    observer.observe(hero);
    observer.observe(aside);

    button.addEventListener('click', () => {
      setPanelOpen(true);
      aside.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      toggleButton.focus({ preventScroll: true });
    });
  };


  /* ===========================================================================
     11. パスワードゲート
     ---------------------------------------------------------------------------
     入力されたパスワードを SHA-256 でハッシュ化し、PASSWORD_HASH と比較する。
     ソースにパスワードそのものは書かないが、ブラウザ内だけの判定なので
     JSを書き換えれば突破できる。「関係者以外がうっかり見ない」ための簡易ロックであり、
     機密情報の保護にはサーバー側の認証（Do.Link 本体のログイン等）を使うこと。

     ■ パスワードの変更方法
       1. ブラウザでこのページを開き、開発者ツールのコンソールで次を実行する
            await (async (pw) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',
              new TextEncoder().encode('do-link:' + pw)))].map((b) => b.toString(16).padStart(2, '0')).join(''))('新しいパスワード')
       2. 表示された64文字を PASSWORD_HASH に貼り付ける
     ======================================================================== */

  /** 'do-link:' + パスワード の SHA-256（初期パスワードは README 参照） */
  const PASSWORD_HASH = 'cb56a75260d06a47c8538f2850c4a5e70144101242d590b14c9a53c5bcdc8537';
  const PASSWORD_SALT = 'do-link:';

  /** 同じタブを開いている間だけ認証を保持する（タブを閉じると再入力）。head のインライン処理と同じキー */
  const AUTH_KEY = 'dolink:auth';

  /**
   * SHA-256（16進文字列を返す）
   * crypto.subtle は https / localhost でしか使えず、社内サーバーの http や
   * file:// では使えない場合があるため、依存しない実装を持つ。
   */
  const sha256 = (text) => {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    // UTF-8 化してパディング（末尾に 0x80、長さを64bitで付加）
    const bytes = [...new TextEncoder().encode(text)];
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i -= 1) bytes.push(Math.floor(bitLength / 2 ** (i * 8)) & 0xff);

    const w = new Array(64);
    for (let offset = 0; offset < bytes.length; offset += 64) {
      for (let i = 0; i < 16; i += 1) {
        const j = offset + i * 4;
        w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
      }
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i += 1) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) | 0, c, b, a, (t1 + t2) | 0];
      }
      [a, b, c, d, e, f, g, h].forEach((value, i) => {
        H[i] = (H[i] + value) | 0;
      });
    }

    return H.map((value) => (value >>> 0).toString(16).padStart(8, '0')).join('');
  };

  /** sessionStorage は環境によって例外を投げるため必ず try で包む */
  const storage = {
    get: () => {
      try { return sessionStorage.getItem(AUTH_KEY); } catch (error) { return null; }
    },
    set: (value) => {
      try { sessionStorage.setItem(AUTH_KEY, value); } catch (error) { /* 保存できなくても閲覧は続行 */ }
    },
    remove: () => {
      try { sessionStorage.removeItem(AUTH_KEY); } catch (error) { /* noop */ }
    },
  };

  const setUnlocked = (isUnlocked) => {
    document.documentElement.classList.toggle('is-unlocked', isUnlocked);
  };

  /**
   * パスワードゲートを初期化する。
   * @param {() => void} onUnlock 認証後に1回だけ呼ぶ処理（ページ本体の初期化）
   */
  const initGate = (onUnlock) => {
    // 保存済みの値が現在のパスワードと一致する場合のみ通す
    // （パスワードを変更すると、以前の認証は自動で無効になる）
    if (storage.get() === PASSWORD_HASH) {
      setUnlocked(true);
      onUnlock();
      return;
    }

    storage.remove();
    setUnlocked(false);

    const gateForm = document.querySelector('.js-gate-form');
    const input = document.querySelector('.js-gate-input');
    const error = document.querySelector('.js-gate-error');
    const toggle = document.querySelector('.js-gate-toggle');
    if (!gateForm || !input || !error || !toggle) return;

    gateForm.noValidate = true;
    input.focus();

    const showError = (message) => {
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      // 連続で間違えた時も揺れるよう、一度外してから付け直す
      gateForm.classList.remove('is-shake');
      void gateForm.offsetWidth;
      gateForm.classList.add('is-shake');
    };

    // パスワードの表示 / 非表示
    toggle.addEventListener('click', () => {
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      toggle.textContent = isVisible ? '表示' : '隠す';
      toggle.setAttribute('aria-pressed', String(!isVisible));
      input.focus();
    });

    input.addEventListener('input', () => {
      if (!input.hasAttribute('aria-invalid')) return;
      input.removeAttribute('aria-invalid');
      error.textContent = '';
    });

    gateForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (input.validity.valueMissing) {
        showError('パスワードを入力してください');
        return;
      }

      if (sha256(PASSWORD_SALT + input.value) !== PASSWORD_HASH) {
        showError('パスワードが違います');
        input.select();
        return;
      }

      storage.set(PASSWORD_HASH);
      input.value = '';
      setUnlocked(true);
      window.scrollTo(0, 0);
      onUnlock();
      // ゲートが消えるため、フォーカスを本文の先頭へ移す
      const main = document.getElementById('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    });
  };


  /* ===========================================================================
     12. 初期化
     ---------------------------------------------------------------------------
     1つの機能の失敗でページ全体が止まらないよう、個別に例外を捕捉する。
     ======================================================================== */
  const boot = () => {
    if (!form || !list || !template || !modal) return;

    [
      ['drawer', initDrawer],
      ['reveal', initReveal],
      ['filter', initFilter],
      ['render', render],
      ['modal', initModal],
      ['sp-cta', initSpCta],
    ].forEach(([name, init]) => {
      try {
        init();
      } catch (error) {
        console.error(`[Do.Link referral] "${name}" の初期化に失敗しました`, error);
      }
    });
  };

  // パスワード認証が済んでからページ本体を初期化する
  initGate(boot);
}
