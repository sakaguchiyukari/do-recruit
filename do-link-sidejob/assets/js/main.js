/**
 * Do.Link — 社内副業ページ
 * -----------------------------------------------------------------------------
 * 構成（上から順に）
 *   1. デモ用データ（ローカル確認時のみ使用）
 *   2. 定数・ラベル定義
 *   3. ユーティリティ
 *   4. データストア（読み書きの窓口）
 *   5. マッチング（スコア計算）
 *   6. 検索・描画
 *   7. 条件パネル（SP開閉）
 *   8. フォーム検証（共通）
 *   9. 詳細モーダル・応募フォーム
 *  10. 掲載管理（投稿・編集・削除）
 *  11. フェードイン（IntersectionObserver）
 *  12. SP固定CTA
 *  13. パスワードゲート
 *  14. 初期化
 *
 * リファラル採用ページ（main.js）と同じ構成にしてあり、11〜13 は共通の処理。
 * file:// で直接開いても動くよう、ESモジュールではなく defer の単一ファイル構成にしている。
 * グローバル変数を作らないよう、全体をブロックスコープで囲む。
 */
{
  /* ===========================================================================
     1. デモ用データ（ローカル確認時のみ使用）
     ---------------------------------------------------------------------------
     claude.ai の外（ローカルの file:// や社内サーバー）で開いたときに、
     デモモードの初期データとして使う。claude.ai 上ではデータベースの内容を表示し、
     ここは使わない。部署名・内容・時間はすべて画面確認用のサンプル。

     id, title, dept, category, summary, description,
     skill, hours(週あたりの目安・時間), style(remote | onsite | hybrid),
     period, reward, postedAt(YYYY-MM-DD), deadline(YYYY-MM-DD | null=随時)
     ======================================================================== */
  const DEMO_ITEMS = [
    {
      id: 'S-001',
      title: 'グループ採用サイトのバナー制作',
      dept: 'グループ本部｜人事部門',
      category: 'corporate',
      summary: '求人媒体やSNSに掲載する採用バナーを、月に数点ずつ制作していただきます。',
      description: '採用広報用のバナー（SNS・求人媒体向け）の制作をお願いします。\n構成案は人事部門で用意します。Illustrator / Photoshop / Canva などの使用経験がある方を想定しています。',
      skill: 'design',
      hours: 3,
      style: 'remote',
      period: '3か月（延長あり）',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-28',
      deadline: '2026-11-30',
    },
    {
      id: 'S-002',
      title: '中古車販売店のSNS運用サポート',
      dept: 'カーライフ事業｜販売部門',
      category: 'car',
      summary: '入庫した車両の紹介投稿やキャンペーン告知など、店舗アカウントの運用を一緒に進めます。',
      description: '投稿カレンダーの作成、写真の選定、キャプション作成を担当します。\n撮影は店舗スタッフが行います。SNSの運用経験、または興味がある方を歓迎します。',
      skill: 'marketing',
      hours: 4,
      style: 'hybrid',
      period: '6か月',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-21',
      deadline: null,
    },
    {
      id: 'S-003',
      title: 'Do.Link 社内報の記事ライター',
      dept: 'グループ本部｜広報',
      category: 'corporate',
      summary: 'グループ各社の人や取り組みを取材し、Do.Link に掲載する記事を書いていただきます。',
      description: '月1本程度、社員インタビューやイベントレポートの取材・執筆をお願いします。\n取材はオンラインでも可能です。文章を書くことが好きな方を歓迎します。',
      skill: 'writing',
      hours: 2,
      style: 'remote',
      period: '継続',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-15',
      deadline: null,
    },
    {
      id: 'S-004',
      title: 'スマホ教室の講師アシスタント',
      dept: 'ICT事業｜店舗運営部門',
      category: 'ict',
      summary: 'シニア向けスマホ教室で、講師のサポートや参加者への個別フォローを担当します。',
      description: '教室の受付、資料配布、操作に迷っている参加者へのサポートをお願いします。\n人と話すのが好きな方、接客経験がある方を歓迎します。',
      skill: 'event',
      hours: 3,
      style: 'onsite',
      period: '3か月',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-25',
      deadline: '2026-11-08',
    },
    {
      id: 'S-005',
      title: 'ゴルフコンペの運営スタッフ',
      dept: 'ゴルフ事業｜営業企画',
      category: 'golf',
      summary: '法人向けゴルフコンペ当日の受付・成績集計・表彰式の進行をサポートします。',
      description: '開催日（月1回程度・土日中心）の受付、スコア集計、表彰式の準備をお願いします。\n事前の打ち合わせは1回、オンラインで行います。',
      skill: 'event',
      hours: 2,
      style: 'onsite',
      period: '単発（毎回募集）',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-18',
      deadline: '2026-12-15',
    },
    {
      id: 'S-006',
      title: '介護記録アプリの改善プロジェクト',
      dept: 'ライフ&ウェルネス事業｜介護部門',
      category: 'wellness',
      summary: '現場スタッフの声をもとに、記録アプリの入力画面や運用ルールの改善を進めます。',
      description: '現場ヒアリングへの同席、改善案の整理、ベンダーとの打ち合わせ資料の作成を担当します。\n業務改善やITツール導入の経験がある方を想定しています。',
      skill: 'it',
      hours: 5,
      style: 'hybrid',
      period: '4か月',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-30',
      deadline: '2026-12-20',
    },
    {
      id: 'S-007',
      title: '店舗売上データの集計・可視化',
      dept: 'グループ本部｜経営企画',
      category: 'corporate',
      summary: '各店舗の売上データを集計し、会議で使うダッシュボードを整えるお仕事です。',
      description: 'Excel / スプレッドシートでのデータ整形と、グラフ・ダッシュボードの作成をお願いします。\n関数やピボットテーブルを使い慣れている方を歓迎します。',
      skill: 'it',
      hours: 4,
      style: 'remote',
      period: '2か月',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-10',
      deadline: '2026-10-31',
    },
    {
      id: 'S-008',
      title: '健康イベントの企画メンバー',
      dept: 'ライフ&ウェルネス事業｜企画',
      category: 'wellness',
      summary: '地域の方に向けたウォーキングイベントの企画を、他部署のメンバーと一緒に考えます。',
      description: '企画会議（月2回・オンライン）への参加と、告知チラシの文案づくりをお願いします。\n当日の運営への参加は任意です。',
      skill: 'marketing',
      hours: 2,
      style: 'hybrid',
      period: '3か月',
      reward: '社内規程に準ずる',
      postedAt: '2026-10-05',
      deadline: null,
    },
    {
      id: 'S-009',
      title: '請求書の発行・入金確認サポート',
      dept: 'グループ本部｜管理部門',
      category: 'corporate',
      summary: '月末月初の繁忙期に、請求書の発行や入金の照合作業をお手伝いいただきます。',
      description: '会計システムからの請求書発行、入金データとの照合をお願いします。\n経理経験は問いませんが、正確な作業が得意な方を歓迎します。',
      skill: 'office',
      hours: 6,
      style: 'remote',
      period: '継続（月末月初のみ）',
      reward: '社内規程に準ずる',
      postedAt: '2026-09-30',
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
    skill: {
      design: 'デザイン・制作',
      marketing: '企画・マーケ',
      writing: '文章・広報',
      it: 'IT・データ',
      event: '接客・イベント',
      office: '事務・バックオフィス',
    },
    style: { remote: 'リモート', onsite: '現地', hybrid: 'リモート＋現地' },
  };

  /** ラベルを引く（共有データは信用しないため、未知の値は「未設定」にする） */
  const labelOf = (group, key) => LABELS[group][key] || '未設定';

  /** 条件「働き方」に対して、一致とみなす案件の style */
  const STYLE_MATCH = {
    remote: ['remote', 'hybrid'],
    onsite: ['onsite', 'hybrid'],
  };

  /** マッチングの配点（合計100。未入力の条件は分母から除外する） */
  const WEIGHT = { skills: 50, hours: 25, style: 25 };

  /** 「マッチ度○%以上のみ表示」のしきい値 */
  const MATCH_THRESHOLD = 50;

  /** 締切が近いと判定する日数 */
  const SOON_DAYS = 7;

  /** stagger の上限（大量表示時に最後のカードが遅れすぎないようにする） */
  const STAGGER_MAX = 6;

  /** 1人が持てる案件数の上限（下書き含む） */
  const MAX_ITEMS_PER_AUTHOR = 30;

  /** データ取得を待つ上限（ミリ秒）。超えたら「接続できない」旨を表示する */
  const LOAD_TIMEOUT = 10000;

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

  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  /** 'YYYY-MM-DD' をローカル時刻の Date に変換する（UTC解釈によるズレを防ぐ） */
  const parseDate = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  /** Date をローカル時刻の 'YYYY-MM-DD' にする */
  const toISODate = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  /** 締切までの日数（締切なしは Infinity） */
  const daysLeft = (job) =>
    job.deadline ? Math.round((parseDate(job.deadline) - today) / 86400000) : Infinity;

  /** 締切を過ぎたか（締切日当日までは募集中） */
  const isExpired = (job) => daysLeft(job) < 0;

  /** 一覧に出す案件か（公開中かつ締切前） */
  const isPublic = (job) => job.status === 'published' && !isExpired(job);

  /** 表示用の日付 'YYYY.MM.DD' */
  const formatDate = (value) => (value ? value.slice(0, 10).replaceAll('-', '.') : '');

  /** 表示用の稼働時間 */
  const formatHours = (hours) => (hours ? `週${hours}時間程度` : '稼働時間未定');

  /** 検索用の正規化（全角英数→半角、大文字→小文字） */
  const normalize = (text) => text.normalize('NFKC').toLowerCase().trim();

  /** テキストを持つ要素を生成する（innerHTML を使わず XSS を防ぐ） */
  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  /** 案件IDを発行する（時刻 + 乱数。同時に作られても衝突しにくい） */
  const createId = () =>
    `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  /** 文字列だけを受け取り、長さを制限する（共有データは信用しない） */
  const toText = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

  /**
   * 保存されている1件を、画面で扱える形に整える。
   * 他の人が書いたデータのため、型・値の範囲をすべて検査する。不正なら null。
   */
  const normalizeItem = (raw, authorId) => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
    const hours = Number(raw.hours);
    return {
      id: toText(raw.id, 60),
      authorId,
      title: toText(raw.title, 40),
      dept: toText(raw.dept, 40),
      category: LABELS.category[raw.category] ? raw.category : '',
      skill: LABELS.skill[raw.skill] ? raw.skill : '',
      hours: Number.isInteger(hours) && hours >= 1 && hours <= 20 ? hours : null,
      style: LABELS.style[raw.style] ? raw.style : '',
      period: toText(raw.period, 30),
      deadline: DATE_PATTERN.test(raw.deadline) ? raw.deadline : null,
      summary: toText(raw.summary, 80),
      description: toText(raw.description, 600),
      reward: toText(raw.reward, 40),
      status: raw.status === 'published' ? 'published' : 'draft',
      postedAt: DATE_PATTERN.test(raw.postedAt) ? raw.postedAt : '',
      updatedAt: toText(raw.updatedAt, 30),
    };
  };

  /** 保存する形（authorId はドキュメントのパスで表すため含めない） */
  const toStored = (item) => {
    const { authorId, ...stored } = item;
    return stored;
  };


  /* ===========================================================================
     4. データストア（読み書きの窓口）
     ---------------------------------------------------------------------------
     画面側は store の次のメンバーだけを使う。本番で API / スプレッドシートに
     移す場合は、同じ形のオブジェクトを返す createXxxStore を足せばよい。
       mode      'db' | 'local'
       uid       閲覧者のID（掲載者の識別。null = 掲載不可）
       isAdmin   全員の案件を修正・削除できるか（管理者）
       canPost   掲載できるか
       subscribe(next, fail)   案件一覧の変更を購読（next(items, isConfirmed)）
       save(authorId, item)    1件を追加・更新
       remove(authorId, id)    1件を削除
       nameOf(ids)             掲載者IDから表示名の Map を作る

     ■ claude.ai の Artifact 上（db）
       posts/<掲載者ID> の1ドキュメントに、その人の案件を items 配列で持つ。
       アクセスルール（公開時に宣言）：
         posts         … 全員が読める / 書き換えは管理者（Editor・Owner）のみ
         posts/{self}  … 自分のドキュメントは Contributor 以上が書ける
       → 掲載者は自分の案件だけを編集でき、管理者は全件を修正・削除できる。

     ■ それ以外（ローカルで開いた場合など）
       デモモード。localStorage に保存し、このブラウザでだけ見える。
     ======================================================================== */
  const POSTS_COLLECTION = 'posts';

  /** ストアのエラー（画面に出す文言を code で切り替える） */
  const storeError = (code) => Object.assign(new Error(code), { code });

  /** items 配列の中の1件を差し替え / 追加 / 削除した新しい配列を返す */
  const upsertItem = (items, item) => {
    const next = items.filter((stored) => stored && stored.id !== item.id);
    if (next.length >= MAX_ITEMS_PER_AUTHOR) throw storeError('limit');
    const index = items.findIndex((stored) => stored && stored.id === item.id);
    if (index === -1) return [toStored(item), ...next];
    next.splice(index, 0, toStored(item));
    return next;
  };
  const withoutItem = (items, id) => items.filter((stored) => stored && stored.id !== id);

  /** { authorId: items[] } を画面用の配列にする */
  const flattenPosts = (postsByAuthor) => [...postsByAuthor.entries()]
    .flatMap(([authorId, items]) => items.map((raw) => normalizeItem(raw, authorId)))
    .filter(Boolean);

  /** claude.ai の Artifact データベースを使うストア */
  const createDbStore = (db, user, { uid, isAdmin, canPost }) => {
    const collection = db.collection(POSTS_COLLECTION);
    const postsByAuthor = new Map();

    // 同じドキュメントへの書き込みは1つずつ順番に行う（並行書き込みで上書きし合わないように）
    const queues = new Map();
    const enqueue = (authorId, task) => {
      const run = (queues.get(authorId) || Promise.resolve()).catch(() => {}).then(task);
      queues.set(authorId, run);
      return run;
    };

    const writeItems = (authorId, update) => enqueue(authorId, () => {
      const items = update([...(postsByAuthor.get(authorId) || [])]);
      return collection.doc(authorId).set({ items });
    });

    return {
      mode: 'db',
      uid,
      isAdmin,
      canPost,
      subscribe: (next, fail) => collection.onSnapshot((snapshot) => {
        postsByAuthor.clear();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          postsByAuthor.set(doc.id, Array.isArray(data && data.items) ? data.items : []);
        });
        next(flattenPosts(postsByAuthor), !snapshot.metadata.fromCache);
      }, fail),
      save: (authorId, item) => writeItems(authorId, (items) => upsertItem(items, item)),
      remove: (authorId, id) => writeItems(authorId, (items) => withoutItem(items, id)),
      nameOf: async (ids) => {
        const names = new Map();
        if (!user || !ids.length) return names;
        const profiles = await user.profiles(ids);
        ids.forEach((id) => names.set(id, (profiles[id] && profiles[id].name) || ''));
        return names;
      },
    };
  };

  /** ローカル確認用のストア（localStorage。使えない環境ではメモリのみ） */
  const createLocalStore = () => {
    const STORAGE_KEY = 'dolink:sidejob:posts';
    const LOCAL_UID = 'local-user';
    const listeners = new Set();
    let memory = null;

    const load = () => {
      if (memory) return memory;
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && typeof saved === 'object') memory = saved;
      } catch (error) { /* 読めなければサンプルから始める */ }
      if (!memory) {
        memory = {
          sample: DEMO_ITEMS.map((item) => ({ ...item, status: 'published', updatedAt: item.postedAt })),
        };
      }
      return memory;
    };

    const toMap = () => new Map(Object.entries(load())
      .map(([authorId, items]) => [authorId, Array.isArray(items) ? items : []]));

    const emit = () => {
      const items = flattenPosts(toMap());
      listeners.forEach((listener) => listener(items, true));
    };

    const write = async (authorId, update) => {
      const data = load();
      data[authorId] = update([...(Array.isArray(data[authorId]) ? data[authorId] : [])]);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (error) { /* メモリ上には残る */ }
      emit();
    };

    return {
      mode: 'local',
      uid: LOCAL_UID,
      isAdmin: true,
      canPost: true,
      subscribe: (next) => {
        listeners.add(next);
        setTimeout(() => next(flattenPosts(toMap()), true));
        return () => listeners.delete(next);
      },
      save: (authorId, item) => write(authorId, (items) => upsertItem(items, item)),
      remove: (authorId, id) => write(authorId, (items) => withoutItem(items, id)),
      nameOf: async (ids) => new Map(ids.map((id) => [id, id === LOCAL_UID ? 'あなた（デモ）' : ''])),
    };
  };

  /**
   * 環境に合ったストアを用意する。
   * claude.ai 上で db が使えない（サインアウト中など）場合は null。
   */
  const initStore = async () => {
    const claude = window.claude;
    if (!claude || typeof claude.use !== 'function') return createLocalStore();

    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db) return null;

    const [uid, isAdmin, canWrite] = user
      ? await Promise.all([user.id(), user.canEdit(), user.can('data.write')])
      : [null, false, null];

    // can() が null のときは「不明」。掲載ボタンは出し、保存が拒否されたら案内する
    return createDbStore(db, user, { uid, isAdmin, canPost: Boolean(uid) && canWrite !== false });
  };


  /* ===========================================================================
     5. マッチング（スコア計算）
     ---------------------------------------------------------------------------
     入力された条件のみで満点を計算し、0〜100 に正規化する。
     条件が1つも入力されていない場合は null（マッチ度を表示しない）。
       skills … 選んだスキルに案件のスキルが含まれるか
       hours  … 案件の稼働目安が「使える時間」以内か
       style  … 働き方が合うか（hybrid はどちらにも一致）
     ======================================================================== */
  const isHoursHit = (job, criteria) =>
    Boolean(criteria.hours) && job.hours !== null && job.hours <= criteria.hours;
  const isStyleHit = (job, criteria) => (STYLE_MATCH[criteria.style] || []).includes(job.style);

  const calcScore = (job, criteria) => {
    let total = 0;
    let earned = 0;

    if (criteria.skills.length) {
      total += WEIGHT.skills;
      if (criteria.skills.includes(job.skill)) earned += WEIGHT.skills;
    }

    if (criteria.hours) {
      total += WEIGHT.hours;
      if (isHoursHit(job, criteria)) earned += WEIGHT.hours;
    }

    if (criteria.style) {
      total += WEIGHT.style;
      if (isStyleHit(job, criteria)) earned += WEIGHT.style;
    }

    return total ? Math.round((earned / total) * 100) : null;
  };


  /* ===========================================================================
     6. 検索・描画
     ======================================================================== */
  const form = document.querySelector('.js-filter-form');
  const list = document.querySelector('.js-result-list');
  const template = document.getElementById('job-card-template');
  const sortSelect = document.querySelector('.js-sort');
  const emptyBox = document.querySelector('.js-empty');
  const loadingBox = document.querySelector('.js-loading');
  const countTargets = document.querySelectorAll('.js-result-count, .js-result-count-apply');
  const activeCount = document.querySelector('.js-active-count');

  /** ストアから届いた全件（下書き・締切済みを含む）と、一覧に出す公開分 */
  let allItems = [];
  let jobs = [];
  let isLoaded = false;

  /** 案件IDから1件を探す（掲載者IDも一致させる：他人が同じIDを書いても混ざらない） */
  const findItem = (id, authorId) =>
    allItems.find((item) => item.id === id && item.authorId === authorId);

  /** フォームの現在値を条件オブジェクトにする */
  const readCriteria = () => {
    const data = new FormData(form);
    return {
      keyword: normalize(data.get('keyword') || ''),
      category: data.get('category') || '',
      skills: data.getAll('skills'),
      hours: Number(data.get('hours')) || 0,
      style: data.get('style') || '',
      matchedOnly: data.get('matchedOnly') === '1',
      sort: sortSelect.value,
    };
  };

  /** 条件なし（プレビュー用） */
  const EMPTY_CRITERIA = { skills: [], hours: 0, style: '' };

  /** 初期値から変更されている条件の数（SPの開閉ボタンに表示） */
  const countActive = (criteria) =>
    [criteria.keyword, criteria.category, criteria.hours, criteria.style, criteria.matchedOnly]
      .filter(Boolean).length + criteria.skills.length;

  /** キーワード検索の対象文字列 */
  const searchableText = (job) => normalize([
    job.title,
    job.dept,
    job.summary,
    job.description,
    job.period,
    labelOf('category', job.category),
    labelOf('skill', job.skill),
    labelOf('style', job.style),
  ].join(' '));

  /** 絞り込み（ハード条件）＋スコア付与＋並び替え */
  const search = (criteria) => {
    const newer = (a, b) => b.job.postedAt.localeCompare(a.job.postedAt);
    const sorters = {
      match: (a, b) => (b.score ?? -1) - (a.score ?? -1) || newer(a, b),
      new: newer,
      deadline: (a, b) => daysLeft(a.job) - daysLeft(b.job),
      light: (a, b) => (a.job.hours ?? Infinity) - (b.job.hours ?? Infinity) || newer(a, b),
    };
    const words = criteria.keyword ? criteria.keyword.split(/\s+/) : [];

    return jobs
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
    element.textContent = left >= 0 && left <= SOON_DAYS
      ? `締切まであと${left}日`
      : `締切 ${formatDate(job.deadline)}`;
    element.classList.toggle('is-soon', left >= 0 && left <= SOON_DAYS);
  };

  /** 初回描画が済んだか（カードの表示演出の切り替えに使う） */
  let hasRendered = false;

  /**
   * 案件カードを1枚生成する。
   * @param {{ preview?: boolean }} options preview: 投稿画面のプレビュー用（演出なし・操作なし）
   */
  const createCard = ({ job, score }, index, criteria, { preview = false } = {}) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const slot = (name) => card.querySelector(`[data-slot="${name}"]`);

    if (!preview) {
      card.style.setProperty('--i', String(Math.min(index, STAGGER_MAX)));
      // 初回はスクロール連動のフェードイン、条件変更後は短い入れ替え演出にする
      // （条件を変えるたびに一覧が消えて見えるのを防ぐ）
      card.classList.add(hasRendered ? 'is-fresh' : 'js-reveal');
    }

    slot('category').textContent = labelOf('category', job.category);

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

    // スキル / 稼働時間 / 働き方（条件と一致したタグは強調）
    const tags = [
      [labelOf('skill', job.skill), criteria.skills.includes(job.skill)],
      [formatHours(job.hours), isHoursHit(job, criteria)],
      [labelOf('style', job.style), isStyleHit(job, criteria)],
    ];
    slot('meta').append(...tags.map(([label, isHit]) => {
      const tag = createElement('li', 'c-job-card__meta-item', label);
      if (isHit) tag.classList.add('is-hit');
      return tag;
    }));

    renderDeadline(slot('deadline'), job);

    const more = slot('more');
    if (preview) {
      more.tabIndex = -1;
    } else {
      more.dataset.jobId = job.id;
      more.dataset.authorId = job.authorId;
      more.setAttribute('aria-label', `${job.title}の詳細を見る`);
    }

    return card;
  };

  /** 検索して結果を描画する */
  const render = () => {
    loadingBox.hidden = isLoaded;
    if (!isLoaded) return;

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

  /** 読み込みに失敗・時間切れのときの表示 */
  const renderLoadError = (message) => {
    loadingBox.hidden = false;
    loadingBox.textContent = message;
  };


  /* ===========================================================================
     7. 条件パネル（SP開閉）
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
     8. フォーム検証（応募フォーム・投稿フォーム共通）
     ---------------------------------------------------------------------------
     HTML の required / pattern / min / maxlength 等をそのまま使い、
     ValidityState から日本語のメッセージを作って aria-describedby の *-error に出す。
     ======================================================================== */

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
      if (field.type === 'radio' || field.tagName === 'SELECT') return '選択してください';
      return '入力してください';
    }
    if (validity.badInput) {
      if (field.type === 'date') return '日付の形式で入力してください';
      if (field.type === 'number') return '数字で入力してください';
    }
    if (validity.rangeUnderflow && field.type === 'date') return '今日以降の日付を選択してください';
    if (validity.rangeUnderflow || validity.rangeOverflow) return `${field.min}〜${field.max}の範囲で入力してください`;
    if (validity.stepMismatch) return '整数で入力してください';
    if (validity.typeMismatch && field.type === 'email') return 'メールアドレスの形式で入力してください';
    if (validity.patternMismatch) {
      if (field.name === 'employeeId') return '半角数字6桁で入力してください';
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

  /** 複数項目を検証し、最初のエラー項目にフォーカスする。全て正しければ true */
  const validateFields = (fields) => {
    const results = [...fields].map(validateField);
    const firstInvalid = [...fields].find((field) => field.getAttribute('aria-invalid') === 'true');
    if (firstInvalid) firstInvalid.focus();
    return !results.includes(false);
  };

  const clearErrors = (targetForm) => {
    targetForm.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
    targetForm.querySelectorAll('.c-form__error, .c-form__alert').forEach((element) => {
      element.textContent = '';
    });
  };

  /** フォームの入力欄（ボタンを除く） */
  const fieldsOf = (targetForm) => targetForm.querySelectorAll('input, select, textarea');

  /** 一度エラーになった項目は、入力のたびに再検証して早くエラーを消す */
  const bindLiveValidation = (targetForm) => {
    // JS有効時は独自のエラー表示を使う（JS無効時はブラウザ標準の検証が働く）
    targetForm.noValidate = true;
    fieldsOf(targetForm).forEach((field) => {
      field.addEventListener('blur', () => {
        if ((field.value && field.type !== 'radio') || field.hasAttribute('aria-invalid')) validateField(field);
      });
      field.addEventListener('input', () => {
        if (!field.hasAttribute('aria-invalid')) return;
        // ラジオは同じグループ全体のエラーを消す
        if (field.type === 'radio') {
          targetForm.querySelectorAll(`input[name="${field.name}"]`).forEach(validateField);
          return;
        }
        validateField(field);
      });
    });
  };


  /* ===========================================================================
     9. 詳細モーダル・応募フォーム
     ======================================================================== */
  const modal = document.querySelector('.js-modal');
  const applyForm = modal.querySelector('.js-apply-form');
  const doneBox = modal.querySelector('.js-modal-done');
  const ownerBox = modal.querySelector('.js-modal-owner');
  const startDateInput = applyForm.querySelector('input[name="startDate"]');
  let lastFocused = null;
  let currentItem = null;

  /** データストア（初期化後に設定） */
  let store = null;

  /** この閲覧者が編集できる案件か */
  const canEditItem = (item) =>
    Boolean(store && store.canPost && (store.isAdmin || item.authorId === store.uid));

  /** 詳細の項目（dt / dd） */
  const specItems = (job) => [
    ['スキル', labelOf('skill', job.skill)],
    ['稼働目安', formatHours(job.hours)],
    ['働き方', labelOf('style', job.style)],
    ['期間', job.period],
    ['報酬', job.reward],
    ['掲載日', formatDate(job.postedAt)],
    ['締切', job.deadline ? formatDate(job.deadline) : '随時'],
  ];

  const renderSpec = (job, posterName) => {
    const items = specItems(job);
    if (posterName) items.push(['掲載者', posterName]);
    modal.querySelector('.js-modal-spec').replaceChildren(...items.flatMap(([term, value]) => [
      createElement('dt', 'c-modal__spec-term', term),
      createElement('dd', 'c-modal__spec-desc', value),
    ]));
  };

  const openModal = (job) => {
    lastFocused = document.activeElement;
    currentItem = job;

    modal.querySelector('.js-modal-category').textContent = labelOf('category', job.category);
    modal.querySelector('.js-modal-dept').textContent = job.dept;
    modal.querySelector('.js-modal-title').textContent = job.title;
    modal.querySelector('.js-modal-desc').textContent = job.description;
    renderSpec(job, '');
    ownerBox.hidden = !canEditItem(job);

    // 掲載者名は後から解決して差し込む（名前は保存せず、表示のたびに引く）
    if (store) {
      store.nameOf([job.authorId]).then((names) => {
        const name = names.get(job.authorId);
        if (name && currentItem === job && modal.open) renderSpec(job, name);
      }).catch(() => { /* 名前が出せなくても表示は続行 */ });
    }

    // フォームを初期化して表示
    applyForm.hidden = false;
    applyForm.dataset.jobId = job.id;
    applyForm.reset();
    clearErrors(applyForm);
    doneBox.hidden = true;

    modal.showModal();
    modal.scrollTop = 0;
  };

  const initModal = () => {
    // 開始日は今日以降のみ選べるようにする
    if (startDateInput) startDateInput.min = toISODate(today);

    // カードの「詳しく見る」（動的に生成されるためイベント委譲）
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-job-id]');
      if (!button) return;
      const job = findItem(button.dataset.jobId, button.dataset.authorId);
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
      if (lastFocused instanceof HTMLElement && lastFocused.isConnected) lastFocused.focus();
    });

    // 掲載者本人・管理者：詳細からそのまま編集へ
    modal.querySelector('.js-modal-edit').addEventListener('click', () => {
      const item = currentItem;
      modal.close();
      if (item) openEditor(item);
    });

    bindLiveValidation(applyForm);

    applyForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validateFields(fieldsOf(applyForm))) return;

      // TODO: 送信先確定後、ここで fetch 等により送信する
      //   const body = new FormData(applyForm);
      //   body.append('projectId', applyForm.dataset.jobId);
      //   await fetch(applyForm.action, { method: 'POST', body });
      applyForm.hidden = true;
      doneBox.hidden = false;
      doneBox.focus();
    });
  };


  /* ===========================================================================
     10. 掲載管理（投稿・編集・削除）
     ---------------------------------------------------------------------------
     ・「新しく案件を掲載する」「編集する」で投稿モーダルを開く
     ・入力に合わせてカードのプレビューを更新する
     ・「公開する」は全項目を検証、「下書き保存」はタイトルのみ必須
     ・削除は誤操作防止のため2回押しで実行する
     ======================================================================== */
  const editor = document.querySelector('.js-editor');
  const editorForm = editor.querySelector('.js-editor-form');
  const editorTitle = editor.querySelector('.js-editor-title');
  const editorAlert = editor.querySelector('.js-editor-alert');
  const editorPreview = editor.querySelector('.js-editor-preview');
  const publishLabel = editor.querySelector('.js-editor-publish-label');
  const submitButtons = editor.querySelectorAll('button[type="submit"]');

  const postNewButton = document.querySelector('.js-post-new');
  const postNote = document.querySelector('.js-post-note');
  const postDemo = document.querySelector('.js-post-demo');
  const postStatus = document.querySelector('.js-post-status');
  const postMine = document.querySelector('.js-post-mine');
  const postMineTitle = document.querySelector('.js-post-mine-title');
  const postList = document.querySelector('.js-post-list');
  const postEmpty = document.querySelector('.js-post-empty');

  /** 編集中の案件（新規は null） */
  let editing = null;
  let editorOpener = null;
  let statusTimer = 0;

  /** 保存・削除の結果をしばらく表示する */
  const showPostStatus = (message) => {
    clearTimeout(statusTimer);
    postStatus.textContent = message;
    statusTimer = setTimeout(() => {
      postStatus.textContent = '';
    }, 5000);
  };

  /** ストアのエラーを、投稿者向けの文言にする */
  const storeErrorMessage = (error) => {
    const code = error && error.code;
    if (code === 'limit') return `掲載できる案件は1人${MAX_ITEMS_PER_AUTHOR}件までです。不要な案件を削除してから保存してください。`;
    if (code === 'quota_exceeded') return '保存できる容量の上限に達しました。不要な案件を削除してください。';
    if (code === 'invalid_argument') return 'この案件を保存する権限がありません。掲載にはページの「Contributor」以上の権限が必要です。';
    if (code === 'revoked' || code === 'not_granted') return 'ページへのアクセス権が変わったため保存できません。ページを開き直してください。';
    return '保存できませんでした。時間をおいてもう一度お試しください。';
  };

  /** フォームの値から案件オブジェクトを作る */
  const readEditor = (status) => {
    const data = new FormData(editorForm);
    const value = (name) => String(data.get(name) || '').trim();
    const hours = Number(value('hours'));
    const now = new Date();
    return {
      id: editing ? editing.id : createId(),
      authorId: editing ? editing.authorId : store.uid,
      title: value('title'),
      dept: value('dept'),
      category: value('category'),
      skill: value('skill'),
      hours: Number.isInteger(hours) && hours > 0 ? hours : null,
      style: value('style'),
      period: value('period'),
      deadline: value('deadline') || null,
      summary: value('summary'),
      description: value('description'),
      reward: value('reward'),
      status,
      // 掲載日は「初めて公開した日」。下書きのままなら空のまま
      postedAt: (editing && editing.postedAt) || (status === 'published' ? toISODate(now) : ''),
      updatedAt: now.toISOString(),
    };
  };

  /** 文字数カウンターを更新する */
  const updateCounters = () => {
    editor.querySelectorAll('[data-count-for]').forEach((counter) => {
      const field = document.getElementById(counter.dataset.countFor);
      if (!field) return;
      counter.textContent = `${field.value.length} / ${field.maxLength}`;
      counter.classList.toggle('is-over', field.value.length > field.maxLength);
    });
  };

  /** 入力中の内容でカードのプレビューを描く（未入力の項目は仮の文言で埋める） */
  const updatePreview = () => {
    const job = readEditor(editing ? editing.status : 'draft');
    job.title = job.title || '案件タイトル';
    job.dept = job.dept || '募集部署';
    job.summary = job.summary || 'ひとこと紹介がここに表示されます。';
    const card = createCard({ job, score: null }, 0, EMPTY_CRITERIA, { preview: true });
    editorPreview.replaceChildren(card);
  };

  /** 投稿フォームに値を流し込む */
  const fillEditor = (item) => {
    editorForm.reset();
    clearErrors(editorForm);
    const set = (name, value) => {
      const field = editorForm.elements.namedItem(name);
      if (field) field.value = value ?? '';
    };
    if (item) {
      ['title', 'dept', 'category', 'skill', 'period', 'deadline', 'summary', 'description', 'reward']
        .forEach((name) => set(name, item[name]));
      set('hours', item.hours ?? '');
      editorForm.querySelectorAll('input[name="style"]').forEach((radio) => {
        radio.checked = radio.value === item.style;
      });
    } else {
      set('reward', '社内規程に準ずる');
    }
  };

  /** 投稿モーダルを開く（item なしで新規） */
  const openEditor = (item = null) => {
    if (!store || !store.canPost) return;
    editorOpener = document.activeElement;
    editing = item;

    editorTitle.textContent = item ? '案件を編集する' : '案件を掲載する';
    publishLabel.textContent = item && item.status === 'published' ? '更新して公開する' : '公開する';

    fillEditor(item);
    // 締切は今日以降。ただし既存案件の締切が過去の場合は、そのまま保存できるよう下限を合わせる
    const deadlineInput = editorForm.elements.namedItem('deadline');
    const minDate = toISODate(today);
    deadlineInput.min = item && item.deadline && item.deadline < minDate ? item.deadline : minDate;

    updateCounters();
    updatePreview();
    editor.showModal();
    editor.scrollTop = 0;
    editorForm.elements.namedItem('title').focus();
  };

  const setSaving = (isSaving) => {
    submitButtons.forEach((button) => {
      button.disabled = isSaving;
    });
    editorForm.setAttribute('aria-busy', String(isSaving));
  };

  /** 掲載管理の一覧（自分の案件。管理者は全件）を描く */
  let manageToken = 0;
  const renderManage = async () => {
    if (!store || !store.canPost || !isLoaded) {
      postMine.hidden = true;
      return;
    }

    const items = (store.isAdmin ? allItems : allItems.filter((item) => item.authorId === store.uid))
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    postMine.hidden = false;
    postMineTitle.textContent = store.isAdmin && store.mode === 'db'
      ? 'すべての掲載案件（管理者として表示）'
      : 'あなたが掲載した案件';
    postEmpty.hidden = items.length > 0;

    // 管理者向けには掲載者名を出す（名前は保存せず、表示のたびに引く）
    const token = ++manageToken;
    let names = new Map();
    if (store.isAdmin && items.length) {
      try {
        names = await store.nameOf([...new Set(items.map((item) => item.authorId))]);
      } catch (error) { /* 名前なしで表示 */ }
      if (token !== manageToken) return;   // 待っている間に新しいデータが来た
    }

    postList.replaceChildren(...items.map((item) => {
      const row = createElement('li', 'c-post-row');
      const body = createElement('div', 'c-post-row__body');
      const meta = createElement('div', 'c-post-row__meta');

      const [statusClass, statusText] = item.status !== 'published'
        ? ['', '下書き']
        : isExpired(item) ? ['c-status--closed', '締切済み'] : ['c-status--published', '公開中'];
      meta.append(
        createElement('span', `c-status ${statusClass}`.trim(), statusText),
        createElement('span', 'c-post-row__date', `更新 ${formatDate(item.updatedAt)}`),
      );
      body.append(meta, createElement('p', 'c-post-row__title', item.title || '（タイトル未入力）'));

      const name = names.get(item.authorId);
      if (store.isAdmin && name) body.append(createElement('p', 'c-post-row__author', `掲載者：${name}`));

      const actions = createElement('div', 'c-post-row__actions');
      const edit = createElement('button', 'c-button c-button--more c-button--small', '編集する');
      edit.type = 'button';
      edit.dataset.action = 'edit';
      edit.setAttribute('aria-label', `${item.title || 'タイトル未入力の案件'}を編集する`);
      const editIcon = createElement('span', 'c-button__icon');
      editIcon.setAttribute('aria-hidden', 'true');
      edit.append(editIcon);

      const remove = createElement('button', 'c-post-row__delete', '削除');
      remove.type = 'button';
      remove.dataset.action = 'delete';
      remove.setAttribute('aria-label', `${item.title || 'タイトル未入力の案件'}を削除する`);

      [edit, remove].forEach((button) => {
        button.dataset.id = item.id;
        button.dataset.authorId = item.authorId;
      });
      actions.append(remove, edit);
      row.append(body, actions);
      return row;
    }));
  };

  /** 掲載ボタン・案内文を閲覧者の権限に合わせる */
  const renderPostAccess = (message) => {
    const canPost = Boolean(store && store.canPost);
    postNewButton.hidden = !canPost;
    postDemo.hidden = !(store && store.mode === 'local');
    postNote.hidden = canPost;
    if (!canPost) {
      postNote.textContent = message
        || (store && !store.uid
          ? '掲載するには claude.ai にサインインしてください。'
          : '掲載するには、このページの「Contributor」以上の権限が必要です。人事部門にお問い合わせください。');
    }
  };

  /** 削除ボタン：1回目で確認表示、4秒以内の2回目で削除 */
  const handleDelete = async (button, item) => {
    if (!button.classList.contains('is-confirm')) {
      button.classList.add('is-confirm');
      button.textContent = 'もう一度押すと削除';
      setTimeout(() => {
        if (!button.isConnected) return;
        button.classList.remove('is-confirm');
        button.textContent = '削除';
      }, 4000);
      return;
    }
    button.disabled = true;
    try {
      await store.remove(item.authorId, item.id);
      showPostStatus(`「${item.title || 'タイトル未入力の案件'}」を削除しました`);
    } catch (error) {
      button.disabled = false;
      showPostStatus(storeErrorMessage(error));
    }
  };

  const initEditor = () => {
    bindLiveValidation(editorForm);

    postNewButton.addEventListener('click', () => openEditor());

    // 掲載管理の一覧（イベント委譲）
    postList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const item = findItem(button.dataset.id, button.dataset.authorId);
      if (!item) return;
      if (button.dataset.action === 'edit') openEditor(item);
      else handleDelete(button, item);
    });

    // 入力のたびにプレビューと文字数を更新
    editorForm.addEventListener('input', () => {
      updateCounters();
      updatePreview();
    });

    // 入力途中で消えないよう、背景クリックでは閉じない（×・キャンセル・Escで閉じる）
    const closeEditor = () => editor.close();
    editor.querySelector('.js-editor-close').addEventListener('click', closeEditor);
    editor.querySelector('.js-editor-cancel').addEventListener('click', closeEditor);
    editor.addEventListener('close', () => {
      editing = null;
      if (editorOpener instanceof HTMLElement && editorOpener.isConnected) editorOpener.focus();
    });

    editorForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(editorForm);

      const status = event.submitter && event.submitter.value === 'draft' ? 'draft' : 'published';
      // 下書きはタイトルだけ必須。公開は全項目を検証する
      const targets = status === 'draft'
        ? [editorForm.elements.namedItem('title')]
        : [...fieldsOf(editorForm)];
      if (!validateFields(targets)) return;

      const item = readEditor(status);
      setSaving(true);
      try {
        await store.save(item.authorId, item);
        editor.close();
        showPostStatus(status === 'draft'
          ? `「${item.title}」を下書き保存しました`
          : `「${item.title}」を公開しました。一覧に反映されています`);
      } catch (error) {
        editorAlert.textContent = storeErrorMessage(error);
        editorAlert.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
      } finally {
        setSaving(false);
      }
    });
  };


  /* ===========================================================================
     11. フェードイン（IntersectionObserver）
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
    const targets = document.querySelectorAll('main .js-reveal');

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
     12. SP固定CTA
     ---------------------------------------------------------------------------
     応募の流れを過ぎ、かつ条件パネル・掲載管理が画面外のときだけ表示する。
     ======================================================================== */
  const initSpCta = () => {
    const cta = document.querySelector('.js-sp-cta');
    const button = document.querySelector('.js-sp-cta-button');
    const flow = document.querySelector('.p-flow');
    const aside = document.querySelector('.p-jobs__aside');
    const post = document.querySelector('.p-post');
    if (!cta || !button || !flow || !aside || !post || !('IntersectionObserver' in window)) return;

    const visible = new Map([[flow, true], [aside, false], [post, false]]);

    const update = () => {
      const show = [...visible.values()].every((isVisible) => !isVisible);
      cta.classList.toggle('is-visible', show);
      cta.setAttribute('aria-hidden', String(!show));
      button.tabIndex = show ? 0 : -1;
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
      update();
    });
    visible.forEach((_, target) => observer.observe(target));

    button.addEventListener('click', () => {
      setPanelOpen(true);
      aside.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      toggleButton.focus({ preventScroll: true });
    });
  };


  /* ===========================================================================
     13. パスワードゲート
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
     14. 初期化
     ---------------------------------------------------------------------------
     1つの機能の失敗でページ全体が止まらないよう、個別に例外を捕捉する。
     画面は先に組み立て、データストアの準備ができたら案件を流し込む。
     ======================================================================== */

  /** データストアを用意し、案件の購読を始める */
  const connectStore = async () => {
    try {
      store = await initStore();
    } catch (error) {
      console.error('[Do.Link sidejob] データストアの初期化に失敗しました', error);
      store = null;
    }

    if (!store) {
      renderLoadError('案件データを読み込めませんでした。サインイン状態を確認して、ページを開き直してください。');
      renderPostAccess('掲載機能を利用できません。サインイン状態を確認してください。');
      return;
    }

    renderPostAccess();

    // 一定時間データが届かなければ案内する（届いた時点で消す）
    let isConfirmed = false;
    const timer = setTimeout(() => {
      if (isConfirmed) return;
      if (isLoaded) showPostStatus('最新の状態を確認できていません。表示が古い可能性があります。');
      else renderLoadError('案件データに接続できません。通信環境を確認して、しばらくお待ちください。');
    }, LOAD_TIMEOUT);

    store.subscribe((items, confirmed) => {
      if (confirmed && !isConfirmed) {
        isConfirmed = true;
        clearTimeout(timer);
      }
      allItems = items;
      jobs = items.filter(isPublic);
      isLoaded = true;
      loadingBox.textContent = '';
      render();
      renderManage();
    }, (error) => {
      clearTimeout(timer);
      console.error('[Do.Link sidejob] 案件データの購読が停止しました', error);
      if (!isLoaded) renderLoadError('案件データを読み込めませんでした。ページを開き直してください。');
      else showPostStatus('案件データの更新が止まりました。最新の状態を見るにはページを開き直してください。');
    });
  };

  const boot = () => {
    if (!form || !list || !template || !modal || !editor) return;

    [
      ['reveal', initReveal],
      ['filter', initFilter],
      ['render', render],
      ['modal', initModal],
      ['editor', initEditor],
      ['sp-cta', initSpCta],
    ].forEach(([name, init]) => {
      try {
        init();
      } catch (error) {
        console.error(`[Do.Link sidejob] "${name}" の初期化に失敗しました`, error);
      }
    });

    connectStore();
  };

  // パスワード認証が済んでからページ本体を初期化する
  initGate(boot);
}
