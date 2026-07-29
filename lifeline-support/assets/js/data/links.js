/**
 * ライフラインサポート — 公的機関・ライフライン事業者リンク集
 * -----------------------------------------------------------------------------
 * ■ このファイルの方針
 *   ・リンク先は原則として「変わりにくいトップページ」を指す。
 *     災害時に深い階層のURLへ直接飛ばすと、リンク切れで行き止まりになるため。
 *   ・すべてのカードに検索用のキーワード（search）を持たせ、
 *     万一URLが変わっていても検索で辿り着けるようにする。
 *   ・外部リンクは通信が必要。オフライン時はその旨をUIで明示する。
 *
 * ■ データ構造
 *   id        … 一意
 *   category  … CATEGORIES の id
 *   name      … 機関・事業者名
 *   url       … リンク先
 *   note      … 何が見られるか（1行）
 *   situations… ホーム画面で「困ったとき」に出す対象の状況 id
 *   power     … 一般送配電事業者の識別子（都道府県から自動選択するために使う）
 *   search    … 検索フォールバックのキーワード
 *   tel       … 電話番号リンク（別タブで開かず、そのまま発信させる）
 *   localSearch … 市区町村名と組み合わせて検索URLを作る（url が空のとき）
 *   prefSearch  … 都道府県名と組み合わせて検索URLを作る（url が空のとき）
 *   localName   … 地域が設定されているときの表示名（「熊本市東区の水道局」など）
 */

export const CATEGORIES = [
  { id: 'emergency', label: '緊急', icon: '🚨', lead: '命に関わるときは迷わず連絡する。' },
  { id: 'quake', label: '地震・気象', icon: '🌏', lead: '揺れ・津波・天気の一次情報。' },
  { id: 'evacuation', label: '避難・自治体', icon: '🏢', lead: '避難所・給水・罹災証明はすべて自治体が窓口。' },
  { id: 'power', label: '停電（電力）', icon: '⚡', lead: '停電情報は「一般送配電事業者」が発表する。' },
  { id: 'water', label: '水道', icon: '💧', lead: '断水と給水は市区町村の水道局が窓口。' },
  { id: 'gas', label: 'ガス', icon: '🔥', lead: '都市ガスは供給会社、プロパンは販売店へ。' },
  { id: 'comms', label: '通信・安否確認', icon: '📱', lead: '通信障害情報と、安否を残す仕組み。' },
  { id: 'traffic', label: '交通・道路', icon: '🚗', lead: '通行止め・鉄道の運行状況。' },
  { id: 'medical', label: '医療・健康', icon: '🏥', lead: '受診先とこころのケア。' },
  { id: 'support', label: '生活再建・支援', icon: '📋', lead: '罹災証明、支援金、住まいの再建。' },
  { id: 'watchout', label: '悪質商法への注意', icon: '🛡', lead: '災害後は必ず便乗商法が起きる。' },
  { id: 'family', label: 'こども・高齢者・ペット', icon: '👨‍👩‍👧', lead: '配慮が必要な人のための情報。' },
  { id: 'prepare', label: '平時の備え', icon: '🎒', lead: '落ち着いたら、次に備える。' },
];

export const LINKS = [
  /* ---------------------------------------------------------------- 緊急 */
  {
    id: 'em-119',
    category: 'emergency',
    name: '119番（消防・救急）',
    url: 'tel:119',
    note: '火事・けが・急病。携帯が圏外表示でも、他社回線につながって発信できることがある。',
    tel: true,
    search: '消防庁 119',
  },
  {
    id: 'em-110',
    category: 'emergency',
    name: '110番（警察）',
    url: 'tel:110',
    note: '事件・事故・行方不明。',
    tel: true,
    search: '警察庁 110',
  },
  {
    id: 'em-118',
    category: 'emergency',
    name: '118番（海上保安庁）',
    url: 'tel:118',
    note: '海での事故・油の流出など。',
    tel: true,
    search: '海上保安庁 118',
  },
  {
    id: 'em-7119',
    category: 'emergency',
    name: '#7119（救急安心センター）',
    url: 'tel:7119',
    note: '救急車を呼ぶか迷ったときの相談窓口。実施していない地域がある。',
    tel: true,
    search: '救急安心センター #7119',
  },
  {
    id: 'em-8000',
    category: 'emergency',
    name: '#8000（こども医療でんわ相談）',
    url: 'tel:8000',
    note: '夜間・休日に子どもの症状を相談できる。全国共通。',
    tel: true,
    search: 'こども医療でんわ相談 #8000',
  },
  {
    id: 'em-fdma',
    category: 'emergency',
    name: '総務省消防庁',
    url: 'https://www.fdma.go.jp/',
    note: '災害情報と被害状況の発表。',
    search: '総務省消防庁',
  },

  /* ------------------------------------------------------- 地震・気象 */
  {
    id: 'qk-jma',
    category: 'quake',
    name: '気象庁',
    url: 'https://www.jma.go.jp/',
    note: '地震・津波・噴火・気象警報の一次情報。まずここを見る。',
    situations: ['blackout', 'water', 'comms', 'gas', 'toilet', 'food'],
    search: '気象庁 地震情報',
  },
  {
    id: 'qk-jma-quake',
    category: 'quake',
    name: '気象庁 防災情報（地震・津波マップ）',
    url: 'https://www.jma.go.jp/bosai/map.html',
    note: '震度・震源・津波の状況を地図で確認できる。',
    search: '気象庁 防災情報 地震',
  },
  {
    id: 'qk-jma-kikikuru',
    category: 'quake',
    name: '気象庁 キキクル（危険度分布）',
    url: 'https://www.jma.go.jp/bosai/risk/',
    note: '土砂災害・浸水・洪水の危険度を色で表示。余震後の雨で二次災害が起きやすい。',
    search: '気象庁 キキクル',
  },
  {
    id: 'qk-bousai',
    category: 'quake',
    name: '内閣府 防災情報のページ',
    url: 'https://www.bousai.go.jp/',
    note: '政府の災害対応と、被災者支援制度のまとめ。',
    search: '内閣府 防災情報のページ',
  },
  {
    id: 'qk-nhk',
    category: 'quake',
    name: 'NHK ニュース・防災',
    url: 'https://www3.nhk.or.jp/news/',
    note: '報道と、地域ごとのライフライン情報。',
    search: 'NHK ニュース 防災',
  },
  {
    id: 'qk-yahoo',
    category: 'quake',
    name: 'Yahoo! 防災速報',
    url: 'https://emg.yahoo.co.jp/',
    note: '地域を登録すると通知が届く。避難情報・停電・断水の集約も早い。',
    search: 'Yahoo 防災速報',
  },

  /* ------------------------------------------------ 避難・自治体 */
  {
    id: 'ev-city',
    category: 'evacuation',
    name: 'お住まいの市区町村',
    url: '',
    note: '避難所の開設状況、給水所、罹災証明、ごみの出し方。災害時にいちばん使う窓口。「地域を設定」すると検索リンクになる。',
    localSearch: '災害 情報',
    localName: '災害情報・避難所',
    situations: ['blackout', 'water', 'comms', 'gas', 'toilet', 'food'],
    search: '市区町村 災害情報',
  },
  {
    id: 'ev-pref',
    category: 'evacuation',
    name: 'お住まいの都道府県',
    url: '',
    note: '広域の被害状況、医療機関の稼働、支援制度。市区町村より広い情報が集まる。',
    prefSearch: '災害 情報',
    localName: '災害情報（都道府県）',
    search: '都道府県 災害情報',
  },
  {
    id: 'ev-hinan',
    category: 'evacuation',
    name: '国土地理院 ハザードマップポータルサイト',
    url: 'https://disaportal.gsi.go.jp/',
    note: '自宅周辺の浸水・土砂災害の危険度と、指定避難所の位置。',
    search: 'ハザードマップポータルサイト',
  },
  {
    id: 'ev-jrc',
    category: 'evacuation',
    name: '日本赤十字社',
    url: 'https://www.jrc.or.jp/',
    note: '救護活動と義援金の受付。',
    search: '日本赤十字社',
  },
  {
    id: 'ev-jvoad',
    category: 'evacuation',
    name: '全国災害ボランティア支援団体ネットワーク（JVOAD）',
    url: 'https://jvoad.jp/',
    note: '支援団体の動きと、支援を受けたいときの相談先。',
    search: 'JVOAD 全国災害ボランティア支援団体ネットワーク',
  },

  /* -------------------------------------------------------- 停電 */
  {
    id: 'pw-hepco',
    category: 'power',
    name: '北海道電力ネットワーク',
    url: 'https://www.hepco.co.jp/network/',
    note: '北海道の停電情報・復旧見通し。',
    situations: ['blackout'],
    power: 'hepco',
    search: '北海道電力ネットワーク 停電情報',
  },
  {
    id: 'pw-tohoku',
    category: 'power',
    name: '東北電力ネットワーク',
    url: 'https://nw.tohoku-epco.co.jp/',
    note: '東北6県と新潟県の停電情報。',
    situations: ['blackout'],
    power: 'tohoku',
    search: '東北電力ネットワーク 停電情報',
  },
  {
    id: 'pw-tepco',
    category: 'power',
    name: '東京電力パワーグリッド 停電情報',
    url: 'https://teideninfo.tepco.co.jp/',
    note: '関東1都6県ほかの停電情報。市区町村単位で確認できる。',
    situations: ['blackout'],
    power: 'tepco',
    search: '東京電力パワーグリッド 停電情報',
  },
  {
    id: 'pw-chuden',
    category: 'power',
    name: '中部電力パワーグリッド',
    url: 'https://powergrid.chuden.co.jp/',
    note: '中部エリアの停電情報。',
    situations: ['blackout'],
    power: 'chuden',
    search: '中部電力パワーグリッド 停電情報',
  },
  {
    id: 'pw-rikuden',
    category: 'power',
    name: '北陸電力送配電',
    url: 'https://www.rikuden.co.jp/nw/',
    note: '富山・石川・福井の停電情報。',
    situations: ['blackout'],
    power: 'rikuden',
    search: '北陸電力送配電 停電情報',
  },
  {
    id: 'pw-kansai',
    category: 'power',
    name: '関西電力送配電',
    url: 'https://www.kansai-td.co.jp/',
    note: '関西エリアの停電情報。',
    situations: ['blackout'],
    power: 'kansai',
    search: '関西電力送配電 停電情報',
  },
  {
    id: 'pw-energia',
    category: 'power',
    name: '中国電力ネットワーク',
    url: 'https://www.energia.co.jp/nw/',
    note: '中国5県の停電情報。',
    situations: ['blackout'],
    power: 'energia',
    search: '中国電力ネットワーク 停電情報',
  },
  {
    id: 'pw-yonden',
    category: 'power',
    name: '四国電力送配電',
    url: 'https://www.yonden.co.jp/nw/',
    note: '四国4県の停電情報。',
    situations: ['blackout'],
    power: 'yonden',
    search: '四国電力送配電 停電情報',
  },
  {
    id: 'pw-kyuden',
    category: 'power',
    name: '九州電力送配電',
    url: 'https://www.kyuden.co.jp/',
    note: '九州7県の停電情報。',
    situations: ['blackout'],
    power: 'kyuden',
    search: '九州電力送配電 停電情報',
  },
  {
    id: 'pw-okiden',
    category: 'power',
    name: '沖縄電力',
    url: 'https://www.okiden.co.jp/',
    note: '沖縄県の停電情報。',
    situations: ['blackout'],
    power: 'okiden',
    search: '沖縄電力 停電情報',
  },
  {
    id: 'pw-occto',
    category: 'power',
    name: '電力広域的運営推進機関（OCCTO）',
    url: 'https://www.occto.or.jp/',
    note: '全国の需給状況。計画停電が検討される局面で参照される。',
    search: '電力広域的運営推進機関',
  },

  /* -------------------------------------------------------- 水道 */
  {
    id: 'wt-city',
    category: 'water',
    name: 'お住まいの市区町村の水道局',
    url: '',
    note: '断水の範囲・復旧見通し・給水所の場所と時間。水道は市区町村ごとの運営。',
    localSearch: '水道局 断水 給水',
    localName: '水道局（断水・給水）',
    situations: ['water'],
    search: '水道局 断水情報',
  },
  {
    id: 'wt-jwwa',
    category: 'water',
    name: '公益社団法人 日本水道協会',
    url: 'https://www.jwwa.or.jp/',
    note: '全国の水道事業者の相互応援。広域の断水状況の目安になる。',
    search: '日本水道協会',
  },
  {
    id: 'wt-mlit',
    category: 'water',
    name: '国土交通省（水管理・国土保全）',
    url: 'https://www.mlit.go.jp/',
    note: '水道行政の所管。上下水道の被害と復旧の全国状況。',
    search: '国土交通省 上下水道',
  },

  /* -------------------------------------------------------- ガス */
  {
    id: 'gs-local',
    category: 'gas',
    name: 'ご契約中のガス会社',
    url: '',
    note: 'ガス臭・復旧見通し・マイコンメーターの復帰方法。検針票や請求書に連絡先がある。',
    localSearch: 'ガス 供給 復旧',
    localName: 'ガス会社',
    situations: ['gas'],
    search: '都市ガス 供給状況',
  },
  {
    id: 'gs-jga',
    category: 'gas',
    name: '一般社団法人 日本ガス協会',
    url: 'https://www.gas.or.jp/',
    note: '全国の都市ガス事業者の一覧と、災害時の供給状況。',
    situations: ['gas'],
    search: '日本ガス協会',
  },
  {
    id: 'gs-lpg',
    category: 'gas',
    name: '一般社団法人 全国LPガス協会',
    url: 'https://www.japanlpg.or.jp/',
    note: 'プロパンガスの取り扱いと、災害時の相談先。',
    situations: ['gas'],
    search: '全国LPガス協会',
  },
  {
    id: 'gs-tokyogas',
    category: 'gas',
    name: '東京ガス',
    url: 'https://www.tokyo-gas.co.jp/',
    note: '関東エリアの都市ガス。',
    search: '東京ガス 供給状況',
  },
  {
    id: 'gs-osakagas',
    category: 'gas',
    name: '大阪ガス',
    url: 'https://www.osakagas.co.jp/',
    note: '近畿エリアの都市ガス。',
    search: '大阪ガス 供給状況',
  },
  {
    id: 'gs-tohogas',
    category: 'gas',
    name: '東邦ガス',
    url: 'https://www.tohogas.co.jp/',
    note: '中部エリアの都市ガス。',
    search: '東邦ガス 供給状況',
  },
  {
    id: 'gs-saibugas',
    category: 'gas',
    name: '西部ガス',
    url: 'https://www.saibugas.co.jp/',
    note: '九州エリアの都市ガス。',
    search: '西部ガス 供給状況',
  },

  /* ------------------------------------------- 通信・安否確認 */
  {
    id: 'cm-171',
    category: 'comms',
    name: '災害用伝言ダイヤル 171',
    url: 'tel:171',
    note: '「171」に電話し、案内に従って自宅の電話番号で録音・再生する。公衆電話からも使える。',
    tel: true,
    situations: ['comms'],
    search: '災害用伝言ダイヤル 171 使い方',
  },
  {
    id: 'cm-web171',
    category: 'comms',
    name: '災害用伝言板 web171',
    url: 'https://www.web171.jp/',
    note: '電話番号をキーに、文字で安否を残せる。家族で「この番号に残す」と決めておく。',
    situations: ['comms'],
    search: 'web171 災害用伝言板',
  },
  {
    id: 'cm-docomo',
    category: 'comms',
    name: 'NTTドコモ',
    url: 'https://www.docomo.ne.jp/',
    note: '通信障害情報と災害用伝言板。',
    situations: ['comms'],
    search: 'ドコモ 障害情報',
  },
  {
    id: 'cm-au',
    category: 'comms',
    name: 'au（KDDI）',
    url: 'https://www.au.com/',
    note: '通信障害情報と災害用伝言板。',
    situations: ['comms'],
    search: 'au 障害情報',
  },
  {
    id: 'cm-softbank',
    category: 'comms',
    name: 'ソフトバンク',
    url: 'https://www.softbank.jp/',
    note: '通信障害情報と災害用伝言板。',
    situations: ['comms'],
    search: 'ソフトバンク 障害情報',
  },
  {
    id: 'cm-rakuten',
    category: 'comms',
    name: '楽天モバイル',
    url: 'https://network.mobile.rakuten.co.jp/',
    note: '通信障害情報。',
    situations: ['comms'],
    search: '楽天モバイル 障害情報',
  },
  {
    id: 'cm-ntte',
    category: 'comms',
    name: 'NTT東日本',
    url: 'https://www.ntt-east.co.jp/',
    note: '固定電話・光回線の障害情報。東日本エリア。',
    situations: ['comms'],
    search: 'NTT東日本 故障情報',
  },
  {
    id: 'cm-nttw',
    category: 'comms',
    name: 'NTT西日本',
    url: 'https://www.ntt-west.co.jp/',
    note: '固定電話・光回線の障害情報。西日本エリア。',
    situations: ['comms'],
    search: 'NTT西日本 故障情報',
  },
  {
    id: 'cm-wlan',
    category: 'comms',
    name: '00000JAPAN（無線LANビジネス推進連絡会）',
    url: 'https://www.wlan-business.org/',
    note: '災害時に開放される無料Wi-Fi。暗号化されていないため、ID・パスワード・決済情報は入力しない。',
    situations: ['comms'],
    search: '00000JAPAN 災害時無料Wi-Fi',
  },
  {
    id: 'cm-soumu',
    category: 'comms',
    name: '総務省',
    url: 'https://www.soumu.go.jp/',
    note: '通信の確保に関する発表、被災地への支援措置。',
    search: '総務省 災害 通信',
  },

  /* ------------------------------------------------- 交通・道路 */
  {
    id: 'tr-mlit',
    category: 'traffic',
    name: '国土交通省',
    url: 'https://www.mlit.go.jp/',
    note: '道路・鉄道・港湾の被害と復旧の全国状況。',
    search: '国土交通省 災害情報',
  },
  {
    id: 'tr-jartic',
    category: 'traffic',
    name: '日本道路交通情報センター（JARTIC）',
    url: 'https://www.jartic.or.jp/',
    note: '全国の通行止め・渋滞情報。',
    search: '日本道路交通情報センター',
  },
  {
    id: 'tr-nexco-e',
    category: 'traffic',
    name: 'NEXCO 東日本',
    url: 'https://www.e-nexco.co.jp/',
    note: '北海道・東北・関東・新潟の高速道路。',
    search: 'NEXCO東日本 通行止め',
  },
  {
    id: 'tr-nexco-c',
    category: 'traffic',
    name: 'NEXCO 中日本',
    url: 'https://www.c-nexco.co.jp/',
    note: '中部・東海・北陸の高速道路。',
    search: 'NEXCO中日本 通行止め',
  },
  {
    id: 'tr-nexco-w',
    category: 'traffic',
    name: 'NEXCO 西日本',
    url: 'https://www.w-nexco.co.jp/',
    note: '近畿・中国・四国・九州の高速道路。',
    search: 'NEXCO西日本 通行止め',
  },
  {
    id: 'tr-rail',
    category: 'traffic',
    name: '鉄道の運行情報（各社）',
    url: '',
    note: '利用する路線の運行情報。「地域を設定」すると検索リンクになる。',
    prefSearch: '鉄道 運行情報',
    localName: '鉄道の運行情報',
    search: '鉄道 運行情報',
  },

  /* ------------------------------------------------- 医療・健康 */
  {
    id: 'md-mhlw',
    category: 'medical',
    name: '厚生労働省',
    url: 'https://www.mhlw.go.jp/',
    note: '医薬品の特例、医療機関の稼働、避難生活の健康管理。',
    search: '厚生労働省 災害',
  },
  {
    id: 'md-emis',
    category: 'medical',
    name: '広域災害救急医療情報システム（EMIS）',
    url: 'https://www.wds.emis.go.jp/',
    note: '被災地の医療機関の稼働状況。',
    search: 'EMIS 広域災害救急医療情報システム',
  },
  {
    id: 'md-kokoro',
    category: 'medical',
    name: '厚生労働省「まもろうよ こころ」',
    url: 'https://www.mhlw.go.jp/mamorouyokokoro/',
    note: '眠れない・不安が強いときの相談窓口一覧。被災後しばらくしてから出る不調にも。',
    search: 'まもろうよこころ 相談窓口',
  },
  {
    id: 'md-pharmacy',
    category: 'medical',
    name: '日本薬剤師会',
    url: 'https://www.nichiyaku.or.jp/',
    note: '被災地での調剤対応、お薬手帳の活用。',
    search: '日本薬剤師会 災害',
  },

  /* --------------------------------------------- 生活再建・支援 */
  {
    id: 'sp-risai',
    category: 'support',
    name: '罹災証明書の申請（市区町村）',
    url: '',
    note: '各種支援の入口になる書類。申請前に、被害状況を写真で撮っておく（全景と被害箇所を複数枚）。',
    localSearch: '罹災証明書',
    localName: '罹災証明書の申請',
    search: '罹災証明書 申請',
  },
  {
    id: 'sp-bousai-shien',
    category: 'support',
    name: '内閣府 被災者支援に関する各種制度',
    url: 'https://www.bousai.go.jp/',
    note: '被災者生活再建支援金、災害弔慰金、税・保険料の減免などの一覧。',
    search: '内閣府 被災者支援 制度',
  },
  {
    id: 'sp-jhf',
    category: 'support',
    name: '住宅金融支援機構',
    url: 'https://www.jhf.go.jp/',
    note: '災害復興住宅融資、返済の相談。',
    search: '住宅金融支援機構 災害復興',
  },
  {
    id: 'sp-zenginkyo',
    category: 'support',
    name: '一般社団法人 全国銀行協会',
    url: 'https://www.zenginkyo.or.jp/',
    note: '通帳・印鑑・キャッシュカードを失ったときの引き出し、ローンの相談。',
    search: '全国銀行協会 災害 預金',
  },
  {
    id: 'sp-sonpo',
    category: 'support',
    name: '日本損害保険協会',
    url: 'https://www.sonpo.or.jp/',
    note: '地震保険の請求、契約内容が分からないときの照会制度。',
    search: '日本損害保険協会 地震保険 照会',
  },
  {
    id: 'sp-nta',
    category: 'support',
    name: '国税庁',
    url: 'https://www.nta.go.jp/',
    note: '雑損控除・災害減免法による所得税の軽減、申告期限の延長。',
    search: '国税庁 災害 雑損控除',
  },

  /* ------------------------------------------- 悪質商法への注意 */
  {
    id: 'wo-188',
    category: 'watchout',
    name: '消費者ホットライン 188（いやや）',
    url: 'tel:188',
    note: '「屋根を直します」「保険金が出ます」などの訪問販売に迷ったら、契約前に電話する。',
    tel: true,
    search: '消費者ホットライン 188',
  },
  {
    id: 'wo-caa',
    category: 'watchout',
    name: '消費者庁',
    url: 'https://www.caa.go.jp/',
    note: '災害に便乗した悪質商法への注意喚起。',
    search: '消費者庁 災害 便乗商法',
  },
  {
    id: 'wo-kokusen',
    category: 'watchout',
    name: '国民生活センター',
    url: 'https://www.kokusen.go.jp/',
    note: '実際に起きた相談事例。手口を知っておくと防げる。',
    search: '国民生活センター 災害 修理',
  },
  {
    id: 'wo-npa',
    category: 'watchout',
    name: '警察庁',
    url: 'https://www.npa.go.jp/',
    note: '義援金詐欺・空き巣への注意喚起。',
    search: '警察庁 災害 詐欺 注意',
  },

  /* ------------------------------- こども・高齢者・ペット */
  {
    id: 'fm-env-pet',
    category: 'family',
    name: '環境省 動物の愛護と適切な管理',
    url: 'https://www.env.go.jp/nature/dobutsu/aigo/',
    note: 'ペットの災害対策、同行避難の考え方。',
    search: '環境省 ペット 災害対策 同行避難',
  },
  {
    id: 'fm-vet',
    category: 'family',
    name: '公益社団法人 日本獣医師会',
    url: 'https://www.nichiju.or.jp/',
    note: '被災地での動物医療の支援情報。',
    search: '日本獣医師会 災害',
  },
  {
    id: 'fm-cfa',
    category: 'family',
    name: 'こども家庭庁',
    url: 'https://www.cfa.go.jp/',
    note: '子育て家庭への支援、保育・学校の再開情報。',
    search: 'こども家庭庁 災害',
  },
  {
    id: 'fm-mext',
    category: 'family',
    name: '文部科学省',
    url: 'https://www.mext.go.jp/',
    note: '学校の再開状況、就学支援。',
    search: '文部科学省 災害 学校',
  },
  {
    id: 'fm-care',
    category: 'family',
    name: '地域包括支援センター（市区町村）',
    url: '',
    note: '高齢者の介護・生活の相談窓口。ヘルパーやデイサービスの再開状況も分かる。',
    localSearch: '地域包括支援センター',
    localName: '地域包括支援センター',
    search: '地域包括支援センター',
  },

  /* ------------------------------------------------- 平時の備え */
  {
    id: 'pr-govonline',
    category: 'prepare',
    name: '政府広報オンライン',
    url: 'https://www.gov-online.go.jp/',
    note: '備蓄・家具固定・避難行動の解説。読みやすくまとまっている。',
    search: '政府広報オンライン 防災',
  },
  {
    id: 'pr-bichiku',
    category: 'prepare',
    name: '東京備蓄ナビ（東京都）',
    url: 'https://www.bichiku.metro.tokyo.lg.jp/',
    note: '家族構成を入れると必要な備蓄量を計算してくれる。東京都以外の人にも使える。',
    search: '東京備蓄ナビ',
  },
  {
    id: 'pr-tokyo-bousai',
    category: 'prepare',
    name: '東京都防災ホームページ',
    url: 'https://www.bousai.metro.tokyo.lg.jp/',
    note: '「東京防災」など、実践的な冊子が無料で読める。',
    search: '東京都防災ホームページ 東京防災',
  },
  {
    id: 'pr-jishin',
    category: 'prepare',
    name: '地震調査研究推進本部',
    url: 'https://www.jishin.go.jp/',
    note: '自宅周辺で想定される地震と、その確率。',
    search: '地震調査研究推進本部',
  },
];

/**
 * ホーム画面の「困ったとき」に出すリンクを状況から絞り込む。
 * 電力会社は、地域設定があればその1社だけに絞る（選択肢が多いと迷うため）。
 *
 * @param {string[]} situations 選択中の状況 id
 * @param {string} powerId 都道府県から決まった一般送配電事業者の id（未設定なら空文字）
 */
export function linksForSituations(situations, powerId) {
  const sit = new Set(situations);

  return LINKS.filter((link) => {
    if (!link.situations || !link.situations.some((id) => sit.has(id))) return false;
    // 電力会社は地域が設定されていれば該当1社のみ、未設定なら全社を出す
    if (link.power && powerId) return link.power === powerId;
    return true;
  });
}

/** カテゴリ id からリンクを取り出す */
export const linksByCategory = (categoryId) => LINKS.filter((l) => l.category === categoryId);
