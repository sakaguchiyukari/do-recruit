/**
 * DO MATCH — 副業・リファラル採用マッチング
 * -----------------------------------------------------------------------------
 * 構成（上から順に）
 *   1. 案件データ（サンプル）
 *   2. 定数・ラベル定義
 *   3. ユーティリティ
 *   4. マッチング（スコア計算）
 *   5. 検索・描画
 *   6. 条件パネル（SP開閉 / タイプ別項目の切り替え）
 *   7. 詳細モーダル・応募フォーム
 *   8. フェードイン（IntersectionObserver）
 *   9. SP固定CTA
 *  10. パスワードゲート
 *  11. 初期化
 *
 * file:// で直接開いても動くよう、ESモジュールではなく defer の単一ファイル構成にしている。
 * グローバル変数を作らないよう、全体をブロックスコープで囲む。
 */
{
  /* ===========================================================================
     1. 案件データ（サンプル）
     ---------------------------------------------------------------------------
     ※ 部署名・内容はすべて画面確認用のサンプル。
     本番では API / スプレッドシート等から同じ形のデータを取得して差し替える。

     共通
       id, type('side'|'referral'), title, dept, category, summary, description,
       skills[], postedAt(YYYY-MM-DD), deadline(YYYY-MM-DD | null=随時)
     副業のみ   side:     { hours(1|2|3), style('remote'|'hybrid'|'onsite'), period, reward }
     リファラルのみ referral: { jobType, employment, area, bonus }
     ======================================================================== */
  const JOBS = [
    {
      id: 'S-001',
      type: 'side',
      title: 'ドコモショップのSNS投稿企画・撮影',
      dept: 'ICT事業｜店舗運営部門',
      category: 'ict',
      summary: '店舗公式SNSで発信するキャンペーン告知やスタッフ紹介の投稿を、企画から撮影まで一緒に作ってくれる方を募集します。',
      description: '店舗公式SNSの投稿企画・撮影・簡単な画像編集をお願いします。\n月8本程度の投稿を想定しています。撮影は店舗で、編集はリモートで対応可能です。',
      skills: ['SNS運用', '写真・動画', '企画'],
      postedAt: '2026-09-24',
      deadline: '2026-10-31',
      side: { hours: 2, style: 'hybrid', period: '3ヶ月（延長あり）', reward: '社内副業規程に準ずる' },
    },
    {
      id: 'S-002',
      type: 'side',
      title: 'ゴルフ場予約データの分析とレポート作成',
      dept: 'ゴルフ事業｜営業企画',
      category: 'golf',
      summary: '予約データから曜日・時間帯別の傾向を可視化し、価格設定の見直しに使える月次レポートを作成します。',
      description: '予約システムから出力したCSVをもとに、利用傾向を分析して月次レポートにまとめます。\nExcel / スプレッドシートでの集計経験がある方歓迎です。',
      skills: ['データ分析', '企画'],
      postedAt: '2026-09-18',
      deadline: null,
      side: { hours: 1, style: 'remote', period: '6ヶ月', reward: '社内副業規程に準ずる' },
    },
    {
      id: 'S-003',
      type: 'side',
      title: 'カーライフ事業の来店アンケート画面の改善',
      dept: 'カーライフ事業｜サービス推進',
      category: 'car',
      summary: '店頭タブレットで使う来店アンケートの画面構成を見直し、回答率を上げるための改善を行います。',
      description: '既存のアンケートフォームの設問設計と画面レイアウトの改善をお願いします。\nノーコードツールでの作成を想定しています。',
      skills: ['デザイン', 'IT・開発'],
      postedAt: '2026-09-10',
      deadline: '2026-11-15',
      side: { hours: 2, style: 'remote', period: '2ヶ月', reward: '社内副業規程に準ずる' },
    },
    {
      id: 'S-004',
      type: 'side',
      title: '地域イベント「親子ゴルフ体験会」の運営サポート',
      dept: 'ゴルフ事業｜コース運営',
      category: 'golf',
      summary: '週末開催の親子向け体験イベントで、受付・誘導・写真撮影などの当日運営を担当します。',
      description: 'イベント当日の受付・誘導・撮影と、事前の準備ミーティング（オンライン）への参加をお願いします。',
      skills: ['イベント運営', '接客', '写真・動画'],
      postedAt: '2026-09-27',
      deadline: '2026-10-05',
      side: { hours: 1, style: 'onsite', period: '単発（1日）', reward: '社内副業規程に準ずる' },
    },
    {
      id: 'S-005',
      type: 'side',
      title: 'グループ広報誌の記事執筆・インタビュー',
      dept: 'グループ本部｜広報',
      category: 'corporate',
      summary: 'グループ各社で活躍する社員へのインタビューを行い、社内広報誌の記事にまとめます。',
      description: 'オンラインまたは対面でのインタビューと、2,000字程度の記事執筆をお願いします。',
      skills: ['ライティング', '企画'],
      postedAt: '2026-09-05',
      deadline: null,
      side: { hours: 1, style: 'hybrid', period: '随時（1記事単位）', reward: '社内副業規程に準ずる' },
    },
    {
      id: 'S-006',
      type: 'side',
      title: '介護施設向け 業務アプリの導入サポート',
      dept: 'ライフ&ウェルネス事業｜介護部門',
      category: 'wellness',
      summary: '記録業務のデジタル化に向けて、アプリの初期設定と現場スタッフへの操作説明を担当します。',
      description: 'アプリの初期設定、操作マニュアルの作成、現地での説明会（2〜3回）をお願いします。',
      skills: ['IT・開発', 'ライティング'],
      postedAt: '2026-08-30',
      deadline: '2026-12-20',
      side: { hours: 3, style: 'hybrid', period: '4ヶ月', reward: '社内副業規程に準ずる' },
    },
    {
      id: 'R-001',
      type: 'referral',
      title: 'ドコモショップ スタッフ',
      dept: 'ICT事業｜店舗運営部門',
      category: 'ict',
      summary: 'スマートフォンの販売や料金プランのご案内を通じて、地域のお客様の暮らしを支えるお仕事です。',
      description: '来店されたお客様への機種・料金プランのご案内、各種手続き、スマホ教室の運営などを担当します。\n接客・販売の経験がある方は特に歓迎します。',
      skills: ['接客', '営業'],
      postedAt: '2026-09-26',
      deadline: null,
      referral: { jobType: 'sales', employment: 'fulltime', area: 'kumamoto-city', bonus: 'あり（制度規程に準ずる）' },
    },
    {
      id: 'R-002',
      type: 'referral',
      title: '自動車整備士',
      dept: 'カーライフ事業｜整備部門',
      category: 'car',
      summary: '車検・点検・一般整備を担当。資格取得支援もあり、経験を活かして長く働ける環境です。',
      description: '車検・法定点検・一般整備・故障診断を担当します。\n自動車整備士資格（2級以上）をお持ちの方を想定しています。',
      skills: ['整備'],
      postedAt: '2026-09-20',
      deadline: null,
      referral: { jobType: 'mechanic', employment: 'fulltime', area: 'kumamoto-city', bonus: 'あり（制度規程に準ずる）' },
    },
    {
      id: 'R-003',
      type: 'referral',
      title: 'ゴルフ場 フロント・レストランスタッフ',
      dept: 'ゴルフ事業｜コース運営',
      category: 'golf',
      summary: 'ご来場のお客様をお迎えするフロント業務と、クラブハウス内レストランでの接客を担当します。',
      description: 'チェックイン・精算などのフロント業務と、レストランでのホール接客をお願いします。',
      skills: ['接客'],
      postedAt: '2026-09-12',
      deadline: '2026-11-30',
      referral: { jobType: 'service', employment: 'parttime', area: 'kumamoto-other', bonus: 'あり（制度規程に準ずる）' },
    },
    {
      id: 'R-004',
      type: 'referral',
      title: '介護職員（デイサービス）',
      dept: 'ライフ&ウェルネス事業｜介護部門',
      category: 'wellness',
      summary: '日中の生活支援やレクリエーションを通じて、利用者さまの「その人らしい毎日」を支えます。',
      description: '入浴・食事などの生活支援、送迎、レクリエーションの企画・運営を担当します。\n資格をお持ちでない方も、取得支援制度があります。',
      skills: ['介護', '接客'],
      postedAt: '2026-09-08',
      deadline: null,
      referral: { jobType: 'care', employment: 'contract', area: 'kumamoto-city', bonus: 'あり（制度規程に準ずる）' },
    },
    {
      id: 'R-005',
      type: 'referral',
      title: '社内SE（グループ情報システム）',
      dept: 'グループ本部｜情報システム',
      category: 'corporate',
      summary: 'グループ各社の業務システム・ネットワークの運用と、DX推進プロジェクトを担当します。',
      description: '社内ヘルプデスク、PC・ネットワーク管理、業務システムの導入支援を担当します。\nインフラ運用またはシステム開発の実務経験がある方を想定しています。',
      skills: ['IT・開発', 'データ分析'],
      postedAt: '2026-09-28',
      deadline: '2026-12-31',
      referral: { jobType: 'engineer', employment: 'fulltime', area: 'kumamoto-city', bonus: 'あり（制度規程に準ずる）' },
    },
    {
      id: 'R-006',
      type: 'referral',
      title: '経理・総務スタッフ',
      dept: 'グループ本部｜管理部門',
      category: 'corporate',
      summary: 'グループ会社の経理処理や総務業務を担当。バックオフィスから事業の成長を支えます。',
      description: '伝票処理、支払・請求業務、備品管理などを担当します。\n会計ソフトの使用経験がある方歓迎です。',
      skills: ['事務'],
      postedAt: '2026-09-01',
      deadline: null,
      referral: { jobType: 'office', employment: 'fulltime', area: 'kumamoto-city', bonus: 'あり（制度規程に準ずる）' },
    },
  ];


  /* ===========================================================================
     2. 定数・ラベル定義
     ======================================================================== */
  const TYPE_LABEL = { side: '副業', referral: 'リファラル' };

  const LABELS = {
    category: {
      ict: 'インフォメーション&コミュニケーション',
      car: 'カーライフ',
      golf: 'ゴルフ',
      wellness: 'ライフ&ウェルネス',
      corporate: 'グループ本部・管理部門',
    },
    hours: { 1: '週5時間未満', 2: '週5〜10時間', 3: '週10時間以上' },
    style: { remote: 'リモート中心', hybrid: 'ハイブリッド', onsite: '現地で活動' },
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
  const WEIGHT = {
    side: { skills: 50, hours: 25, style: 25 },
    referral: { jobTypes: 50, employment: 25, area: 25 },
  };

  /** 「マッチ度○%以上のみ表示」のしきい値 */
  const MATCH_THRESHOLD = 50;

  /** 締切が近いと判定する日数 */
  const SOON_DAYS = 7;

  /** stagger の上限（大量表示時に最後のカードが遅れすぎないようにする） */
  const STAGGER_MAX = 6;

  const DESKTOP_QUERY = window.matchMedia('(min-width: 1024px)');
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');


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

  /** 表示用の日付 'M/D' */
  const formatDate = (value) => {
    const date = parseDate(value);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

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

  /** 副業案件のスコア */
  const scoreSide = (job, criteria) => {
    const weight = WEIGHT.side;
    let total = 0;
    let earned = 0;

    // スキル：案件が求めるスキルのうち、いくつ持っているか
    if (criteria.skills.length) {
      total += weight.skills;
      const hit = job.skills.filter((skill) => criteria.skills.includes(skill)).length;
      earned += weight.skills * (hit / job.skills.length);
    }

    // 稼働時間：案件の想定以上に稼働できれば満点、1段階不足なら部分点
    if (criteria.hours) {
      total += weight.hours;
      const diff = Number(criteria.hours) - job.side.hours;
      if (diff >= 0) earned += weight.hours;
      else if (diff === -1) earned += weight.hours * 0.4;
    }

    // 働き方：一致で満点、どちらかがハイブリッドなら部分点
    if (criteria.style) {
      total += weight.style;
      if (criteria.style === job.side.style) earned += weight.style;
      else if (criteria.style === 'hybrid' || job.side.style === 'hybrid') earned += weight.style * 0.5;
    }

    return total ? Math.round((earned / total) * 100) : null;
  };

  /** リファラル求人のスコア */
  const scoreReferral = (job, criteria) => {
    const weight = WEIGHT.referral;
    let total = 0;
    let earned = 0;

    if (criteria.jobTypes.length) {
      total += weight.jobTypes;
      if (criteria.jobTypes.includes(job.referral.jobType)) earned += weight.jobTypes;
    }

    if (criteria.employment) {
      total += weight.employment;
      if (criteria.employment === job.referral.employment) earned += weight.employment;
    }

    if (criteria.area) {
      total += weight.area;
      if (criteria.area === job.referral.area) earned += weight.area;
    }

    return total ? Math.round((earned / total) * 100) : null;
  };

  const calcScore = (job, criteria) =>
    job.type === 'side' ? scoreSide(job, criteria) : scoreReferral(job, criteria);


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

  /** フォームの現在値を条件オブジェクトにする（disabled の fieldset は含まれない） */
  const readCriteria = () => {
    const data = new FormData(form);
    return {
      type: data.get('type') || 'all',
      keyword: normalize(data.get('keyword') || ''),
      category: data.get('category') || '',
      skills: data.getAll('skills'),
      hours: data.get('hours') || '',
      style: data.get('style') || '',
      jobTypes: data.getAll('jobTypes'),
      employment: data.get('employment') || '',
      area: data.get('area') || '',
      matchedOnly: data.get('matchedOnly') === '1',
      sort: sortSelect.value,
    };
  };

  /** 案件タイプ以外で、初期値から変更されている条件の数 */
  const countActive = (criteria) =>
    [
      criteria.type !== 'all',
      criteria.keyword,
      criteria.category,
      criteria.hours,
      criteria.style,
      criteria.employment,
      criteria.area,
      criteria.matchedOnly,
    ].filter(Boolean).length + criteria.skills.length + criteria.jobTypes.length;

  /** キーワード検索の対象文字列 */
  const searchableText = (job) => {
    const extra = job.type === 'side'
      ? [LABELS.style[job.side.style]]
      : [LABELS.jobType[job.referral.jobType], LABELS.employment[job.referral.employment]];
    return normalize([job.title, job.dept, job.summary, job.description, ...job.skills, ...extra].join(' '));
  };

  /** 絞り込み（ハード条件）＋スコア付与＋並び替え */
  const search = (criteria) => {
    const sorters = {
      match: (a, b) => (b.score ?? -1) - (a.score ?? -1) || b.job.postedAt.localeCompare(a.job.postedAt),
      new: (a, b) => b.job.postedAt.localeCompare(a.job.postedAt),
      deadline: (a, b) => daysLeft(a.job) - daysLeft(b.job),
    };

    return JOBS
      .filter(isOpen)
      .filter((job) => criteria.type === 'all' || job.type === criteria.type)
      .filter((job) => !criteria.category || job.category === criteria.category)
      .filter((job) => !criteria.keyword || criteria.keyword.split(/\s+/).every((word) => searchableText(job).includes(word)))
      .map((job) => ({ job, score: calcScore(job, criteria) }))
      .filter(({ score }) => !criteria.matchedOnly || (score !== null && score >= MATCH_THRESHOLD))
      .sort(sorters[criteria.sort] || sorters.match);
  };

  /** カード内のメタ情報（案件タイプごとに項目が異なる） */
  const metaItems = (job) =>
    job.type === 'side'
      ? [LABELS.hours[job.side.hours], LABELS.style[job.side.style], job.side.period]
      : [LABELS.jobType[job.referral.jobType], LABELS.employment[job.referral.employment], LABELS.area[job.referral.area]];

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

  /** 案件カードを1枚生成する */
  const createCard = ({ job, score }, index, criteria) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const slot = (name) => card.querySelector(`[data-slot="${name}"]`);

    card.classList.add(`c-job-card--${job.type}`);
    card.style.setProperty('--i', String(Math.min(index, STAGGER_MAX)));
    // 初回はスクロール連動のフェードイン、条件変更後は短い入れ替え演出にする
    // （条件を変えるたびに一覧が消えて見えるのを防ぐ）
    card.classList.add(hasRendered ? 'is-fresh' : 'js-reveal');

    const badge = slot('badge');
    badge.textContent = TYPE_LABEL[job.type];
    badge.classList.add(`c-type-badge--${job.type}`);

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

    metaItems(job).forEach((text) => {
      slot('meta').append(createElement('li', 'c-job-card__meta-item', text));
    });

    job.skills.forEach((skill) => {
      const tag = createElement('li', 'c-tags__item', skill);
      if (job.type === 'side' && criteria.skills.includes(skill)) tag.classList.add('is-hit');
      slot('tags').append(tag);
    });

    renderDeadline(slot('deadline'), job);

    const more = slot('more');
    more.dataset.jobId = job.id;
    more.setAttribute('aria-label', `${job.title}の詳細を見る`);

    return card;
  };

  /** 初回描画が済んだか（カードの表示演出の切り替えに使う） */
  let hasRendered = false;

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

  /** ヒーローの公開件数 */
  const renderHeroCounts = () => {
    ['side', 'referral'].forEach((type) => {
      const target = document.querySelector(`.js-count-${type}`);
      if (target) target.textContent = String(JOBS.filter((job) => job.type === type && isOpen(job)).length);
    });
  };


  /* ===========================================================================
     6. 条件パネル（SP開閉 / タイプ別項目の切り替え）
     ======================================================================== */
  const toggleButton = document.querySelector('.js-filter-toggle');
  const applyButton = document.querySelector('.js-filter-apply');
  const typeBlocks = form.querySelectorAll('[data-filter-for]');

  /** 案件タイプに応じて、関係のないマッチング条件を隠して無効化する */
  const syncTypeBlocks = () => {
    const type = form.elements.type.value;
    typeBlocks.forEach((block) => {
      const isRelevant = type === 'all' || block.dataset.filterFor === type;
      block.hidden = !isRelevant;
      block.disabled = !isRelevant; // disabled の fieldset は FormData に含まれない
    });
  };

  const setPanelOpen = (isOpen) => {
    form.classList.toggle('is-open', isOpen);
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  };

  /** 案件タイプを外部（ヒーローのボタン等）から切り替える */
  const selectType = (type) => {
    const radio = form.querySelector(`input[name="type"][value="${type}"]`);
    if (!radio) return;
    radio.checked = true;
    syncTypeBlocks();
    render();
  };

  const initFilter = () => {
    toggleButton.addEventListener('click', () => {
      setPanelOpen(!form.classList.contains('is-open'));
    });

    // SP：結果を見るボタンでパネルを閉じて結果へ移動
    applyButton.addEventListener('click', () => {
      setPanelOpen(false);
      document.getElementById('results').scrollIntoView({ behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth' });
    });

    // 入力のたびに即時反映（キーワードは入力が落ち着いてから）
    let keywordTimer = 0;
    form.addEventListener('input', (event) => {
      if (event.target.name === 'keyword') {
        clearTimeout(keywordTimer);
        keywordTimer = setTimeout(render, 200);
        return;
      }
      if (event.target.name === 'type') syncTypeBlocks();
      render();
    });

    // Enter キーでページ遷移しないようにする
    form.addEventListener('submit', (event) => event.preventDefault());

    // reset イベントは値が戻る「前」に発火するため、次のタスクで反映する
    form.addEventListener('reset', () => {
      setTimeout(() => {
        syncTypeBlocks();
        render();
      });
    });

    // form 属性で関連付けた並び順は form の input イベントに乗らないため個別に監視
    sortSelect.addEventListener('change', render);

    document.querySelector('.js-empty-reset').addEventListener('click', () => form.reset());

    // ヒーローの「副業案件を探す」等：タイプを選んだ状態で検索へ
    document.querySelectorAll('[data-type-link]').forEach((link) => {
      link.addEventListener('click', () => selectType(link.dataset.typeLink));
    });

    // PC幅に広がったら SP 用の開閉状態をリセット
    DESKTOP_QUERY.addEventListener('change', () => setPanelOpen(false));

    syncTypeBlocks();
  };


  /* ===========================================================================
     7. 詳細モーダル・応募フォーム
     ======================================================================== */
  const modal = document.querySelector('.js-modal');
  const applyForms = modal.querySelectorAll('.js-apply-form');
  const doneBox = modal.querySelector('.js-modal-done');
  let lastFocused = null;

  /** 詳細の項目（dt / dd） */
  const specItems = (job) => {
    const common = [
      ['事業領域', LABELS.category[job.category]],
      ['掲載日', formatDate(job.postedAt)],
      ['締切', job.deadline ? formatDate(job.deadline) : '随時'],
    ];
    const typed = job.type === 'side'
      ? [
        ['想定稼働', LABELS.hours[job.side.hours]],
        ['働き方', LABELS.style[job.side.style]],
        ['期間', job.side.period],
        ['報酬', job.side.reward],
      ]
      : [
        ['職種', LABELS.jobType[job.referral.jobType]],
        ['雇用形態', LABELS.employment[job.referral.employment]],
        ['勤務エリア', LABELS.area[job.referral.area]],
        ['紹介報奨金', job.referral.bonus],
      ];
    return [...typed, ...common];
  };

  const openModal = (job) => {
    lastFocused = document.activeElement;

    const badge = modal.querySelector('.js-modal-badge');
    badge.textContent = TYPE_LABEL[job.type];
    badge.className = `c-type-badge c-type-badge--${job.type} js-modal-badge`;

    modal.querySelector('.js-modal-dept').textContent = job.dept;
    modal.querySelector('.js-modal-title').textContent = job.title;
    modal.querySelector('.js-modal-desc').textContent = job.description;

    const spec = modal.querySelector('.js-modal-spec');
    spec.replaceChildren(...specItems(job).flatMap(([term, value]) => [
      createElement('dt', 'c-modal__spec-term', term),
      createElement('dd', 'c-modal__spec-desc', value),
    ]));

    const tags = modal.querySelector('.js-modal-tags');
    tags.replaceChildren(...job.skills.map((skill) => createElement('li', 'c-tags__item', skill)));

    // 案件タイプに対応するフォームのみ表示し、状態を初期化
    applyForms.forEach((applyForm) => {
      applyForm.hidden = applyForm.dataset.formType !== job.type;
      applyForm.dataset.jobId = job.id;
      applyForm.reset();
      clearErrors(applyForm);
    });
    doneBox.hidden = true;

    modal.showModal();
    modal.scrollTop = 0;
  };

  const closeModal = () => modal.close();

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

  const clearErrors = (applyForm) => {
    applyForm.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
    applyForm.querySelectorAll('.c-form__error').forEach((element) => {
      element.textContent = '';
    });
  };

  const initModal = () => {
    // カードの「詳細を見る」（動的に生成されるためイベント委譲）
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-job-id]');
      if (!button) return;
      const job = JOBS.find((item) => item.id === button.dataset.jobId);
      if (job) openModal(job);
    });

    modal.querySelectorAll('.js-modal-close').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    // 背景（::backdrop）クリックで閉じる
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    // 閉じたら元のボタンへフォーカスを戻す
    modal.addEventListener('close', () => {
      if (lastFocused instanceof HTMLElement) lastFocused.focus();
    });

    applyForms.forEach((applyForm) => {
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
    });
  };


  /* ===========================================================================
     8. フェードイン（IntersectionObserver）
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
    // 静的な要素は同じ親の中で順に遅延させる
    const counters = new Map();
    document.querySelectorAll('main > section .js-reveal').forEach((element) => {
      const parent = element.parentElement;
      const index = counters.get(parent) ?? 0;
      element.style.setProperty('--i', String(Math.min(index, STAGGER_MAX)));
      counters.set(parent, index + 1);
    });

    observeReveal(document.querySelectorAll('main > section .js-reveal'));
  };


  /* ===========================================================================
     9. SP固定CTA
     ---------------------------------------------------------------------------
     ヒーローを過ぎ、かつ条件パネルが画面外のときだけ表示する。
     ======================================================================== */
  const initSpCta = () => {
    const cta = document.querySelector('.js-sp-cta');
    const button = document.querySelector('.js-sp-cta-button');
    const hero = document.querySelector('.p-hero');
    const aside = document.querySelector('.p-search__aside');
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
      aside.scrollIntoView({ behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth', block: 'start' });
      toggleButton.focus({ preventScroll: true });
    });
  };


  /* ===========================================================================
     10. パスワードゲート
     ---------------------------------------------------------------------------
     入力されたパスワードを SHA-256 でハッシュ化し、PASSWORD_HASH と比較する。
     ソースにパスワードそのものは書かないが、ブラウザ内だけの判定なので
     JSを書き換えれば突破できる。「関係者以外がうっかり見ない」ための簡易ロックであり、
     機密情報の保護にはサーバー側の認証を使うこと。

     ■ パスワードの変更方法
       1. ブラウザでこのページを開き、開発者ツールのコンソールで次を実行する
            await (async (pw) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',
              new TextEncoder().encode('do-match:' + pw)))].map((b) => b.toString(16).padStart(2, '0')).join(''))('新しいパスワード')
       2. 表示された64文字を PASSWORD_HASH に貼り付ける
     ======================================================================== */

  /** 'do-match:' + パスワード の SHA-256（初期パスワードは README 参照） */
  const PASSWORD_HASH = '55dfbad290ee45af1583b251fe0303652e6ad996e2cb6469b7c562f0acaa36c9';
  const PASSWORD_SALT = 'do-match:';

  /** 同じタブを開いている間だけ認証を保持する（タブを閉じると再入力） */
  const AUTH_KEY = 'domatch:auth';

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
     11. 初期化
     ---------------------------------------------------------------------------
     1つの機能の失敗でページ全体が止まらないよう、個別に例外を捕捉する。
     ======================================================================== */
  const boot = () => {
    if (!form || !list || !template || !modal) return;

    [
      ['reveal', initReveal],
      ['filter', initFilter],
      ['render', () => { renderHeroCounts(); render(); }],
      ['modal', initModal],
      ['sp-cta', initSpCta],
    ].forEach(([name, init]) => {
      try {
        init();
      } catch (error) {
        console.error(`[DO MATCH] "${name}" の初期化に失敗しました`, error);
      }
    });
  };

  // パスワード認証が済んでからページ本体を初期化する
  initGate(boot);
}
