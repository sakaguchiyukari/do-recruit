/**
 * 共通処理
 *   - API 通信（GAS / デモモード切替・リトライ）
 *   - 表示用ラベル
 *   - IntersectionObserver によるフェードイン
 *   - デモ用ダミーデータ（700名）
 */
(() => {
  'use strict';

  const CONFIG = window.SAFETY_CONFIG;
  const IS_DEMO = !CONFIG.GAS_ENDPOINT;

  /* ============================================================
     表示ラベル
     ============================================================ */
  const LABELS = Object.freeze({
    status: { safe: '無事', minor: '軽傷', severe: '重傷・救助要', none: '未回答' },
    location: { home: '自宅', office: '勤務先', shelter: '避難所', moving: '移動中', other: 'その他' },
    work: { yes: '可能', remote: '在宅なら可', no: '不可' },
    family: { safe: '全員無事', injured: '負傷者あり', unknown: '連絡つかず', none: '該当なし' }
  });

  /* ============================================================
     ユーティリティ
     ============================================================ */
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

  const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /** アプリ側のエラー（認証失敗など）。リトライしない */
  class ApiError extends Error {}

  /* ============================================================
     フェードイン（IntersectionObserver）
     ============================================================ */
  const initFade = (root = document) => {
    const targets = root.querySelectorAll('.js-fade:not(.is-visible)');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((el) => io.observe(el));
  };

  /* ============================================================
     デモモード（GAS 未設定時）
     localStorage に保存し、回答画面⇔管理画面で連動させる
     ============================================================ */
  const Demo = (() => {
    const KEY = 'safety-demo-v1';
    const DEPTS = ['総務部', '人事部', '経理部', '営業一部', '営業二部', '製造部', '品質管理部', '物流部', '技術開発部', '情報システム部'];
    const SEI = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '斎藤', '清水', '阿部'];
    const MEI = ['大翔', '蓮', '陽菜', '結衣', '湊', '葵', '悠真', '凛', '健太', '美咲', '翔太', 'さくら', '拓海', '真央', '颯', '花', '大輝', '七海', '直樹', '彩'];

    // 再現性のある疑似乱数（毎回同じダミーデータにする）
    const rng = (seed) => () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const buildEmployees = () => {
      const rand = rng(42);
      return Array.from({ length: 700 }, (_, i) => ({
        empId: String(100001 + i),
        name: `${SEI[Math.floor(rand() * SEI.length)]} ${MEI[Math.floor(rand() * MEI.length)]}`,
        dept: DEPTS[Math.floor(rand() * DEPTS.length)]
      }));
    };

    const buildSeed = (employees) => {
      const rand = rng(7);
      const now = Date.now();
      const responses = {};
      employees.forEach((emp) => {
        if (rand() > 0.64) return; // 約64%が回答済み
        const r = rand();
        responses[emp.empId] = {
          status: r < 0.9 ? 'safe' : r < 0.98 ? 'minor' : 'severe',
          location: ['home', 'home', 'office', 'shelter', 'moving'][Math.floor(rand() * 5)],
          work: ['yes', 'yes', 'remote', 'no'][Math.floor(rand() * 4)],
          family: ['safe', 'safe', 'safe', 'none', 'unknown'][Math.floor(rand() * 5)],
          comment: rand() < 0.08 ? '自宅周辺で停電が続いています。' : '',
          answeredAt: new Date(now - Math.floor(rand() * 3 * 3600 * 1000)).toISOString()
        };
      });
      return {
        event: { id: 'demo-1', title: '【デモ】地震発生に伴う安否確認', startedAt: new Date(now - 3 * 3600 * 1000).toISOString() },
        responses
      };
    };

    const employees = buildEmployees();

    const load = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (saved && saved.event) return saved;
      } catch (e) { /* 破損時は作り直す */ }
      const seed = buildSeed(employees);
      save(seed);
      return seed;
    };

    const save = (state) => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 容量超過などは無視 */ }
    };

    const handle = async (action, payload) => {
      await sleep(350); // 通信っぽい待ち時間
      const state = load();

      switch (action) {
        case 'getEvent':
          return { event: state.event };

        case 'answer': {
          const emp = employees.find((e) => e.empId === payload.empId);
          // デモでは確認コードは全員「1234」
          if (!emp || payload.pin !== '1234') {
            throw new ApiError('社員番号または確認コードが正しくありません（デモ：100001〜100700 / 1234）');
          }
          const answeredAt = new Date().toISOString();
          state.responses[emp.empId] = {
            status: payload.status, location: payload.location, work: payload.work,
            family: payload.family, comment: payload.comment, answeredAt
          };
          save(state);
          return { name: emp.name, answeredAt };
        }

        case 'adminSummary':
          return {
            event: state.event,
            rows: employees.map((emp) => ({ ...emp, ...(state.responses[emp.empId] || {}) }))
          };

        case 'adminStartEvent':
          state.event = { id: `demo-${Date.now()}`, title: payload.title, startedAt: new Date().toISOString() };
          state.responses = {};
          save(state);
          return { event: state.event };

        default:
          throw new ApiError('不明な操作です');
      }
    };

    return { handle };
  })();

  /* ============================================================
     API 呼び出し
     GAS へは Content-Type: text/plain で POST する
     （application/json だと CORS プリフライトが発生し GAS では失敗するため）
     ============================================================ */
  const api = async (action, payload = {}) => {
    if (IS_DEMO) return Demo.handle(action, payload);

    let lastError;
    for (let attempt = 0; attempt < CONFIG.RETRY; attempt += 1) {
      try {
        const res = await fetch(CONFIG.GAS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, ...payload })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new ApiError(json.message || 'エラーが発生しました');
        return json.data;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        lastError = err;
        // アクセス集中時に備え、待ち時間を伸ばしながら再試行（指数バックオフ＋揺らぎ）
        await sleep(800 * 2 ** attempt + Math.random() * 500);
      }
    }
    console.error(lastError);
    throw new Error('通信に失敗しました。電波の良い場所で、もう一度送信してください。');
  };

  /* ============================================================
     共通初期化
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    if (IS_DEMO) {
      document.querySelectorAll('[data-demo-badge], [data-demo-hint]').forEach((el) => { el.hidden = false; });
    }
    initFade();
  });

  // 公開
  window.SafetyApp = Object.freeze({ api, ApiError, LABELS, IS_DEMO, escapeHtml, formatDateTime, initFade });
})();
