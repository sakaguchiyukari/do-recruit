/**
 * ライフラインサポート — 状況・世帯条件・地域のマスタデータ
 * -----------------------------------------------------------------------------
 * このファイルは「絞り込みの軸」だけを定義する。
 * 実際の対策文（コンテンツ）は data/items.js、外部リンクは data/links.js。
 *
 * ここで定義した id は localStorage に保存されるため、
 * 一度公開したあとに id を変更しないこと（利用者の設定が失われる）。
 */

/**
 * 今困っていること（ライフラインの状況）
 * order … ホーム画面での並び順。数字が小さいほど生命維持に直結する。
 */
export const SITUATIONS = [
  {
    id: 'blackout',
    label: '停電',
    icon: '⚡',
    order: 1,
    statusLabel: '停電中',
    lead: '明かり・情報・冷蔵庫が同時に止まります。まず電池を守ることが最優先です。',
  },
  {
    id: 'water',
    label: '断水',
    icon: '💧',
    order: 2,
    statusLabel: '断水中',
    lead: '飲む水とトイレの水は別に確保します。いま家にある水を捨てないでください。',
  },
  {
    id: 'toilet',
    label: 'トイレが使えない',
    icon: '🚽',
    order: 3,
    statusLabel: 'トイレ不可',
    lead: '排水管の被害が分かるまで流さない。袋と凝固剤で「持ち帰る」方式に切り替えます。',
  },
  {
    id: 'comms',
    label: '通信障害',
    icon: '📱',
    order: 4,
    statusLabel: '通信障害',
    lead: '通話よりテキスト。電波を探し続けるだけで電池は減ります。',
  },
  {
    id: 'gas',
    label: 'ガス停止',
    icon: '🔥',
    order: 5,
    statusLabel: 'ガス停止',
    lead: 'ガス臭があるときは火も電気スイッチも触らないでください。',
  },
  {
    id: 'food',
    label: '食料不足',
    icon: '🍙',
    order: 6,
    statusLabel: '食料不足',
    lead: '家にあるものを全部出して並べる。消費の順番を決めるだけで数日変わります。',
  },
];

/**
 * 世帯条件（配慮が必要な人がいるか）
 * 選択すると、その人向けの注意点が結果の上位に差し込まれる。
 */
export const HOUSEHOLDS = [
  { id: 'baby', label: '乳幼児・子どもがいる', icon: '👶' },
  { id: 'elderly', label: '高齢者がいる', icon: '👴' },
  { id: 'pet', label: 'ペットがいる', icon: '🐶' },
  { id: 'medical', label: '持病・医療機器がある', icon: '🩺' },
  { id: 'pregnant', label: '妊娠中の人がいる', icon: '🤰' },
];

/** カードの種類。表示順もこの配列の順に従う。 */
export const KINDS = [
  {
    id: 'now',
    label: '今すぐやること',
    icon: '✅',
    note: 'チェックを付けると記録されます（この端末内だけに保存）',
  },
  {
    id: 'hack',
    label: 'ライフハック',
    icon: '💡',
    note: '道具がなくても代用できる工夫',
  },
  {
    id: 'caution',
    label: '命に関わる注意',
    icon: '⚠️',
    note: '災害後の二次被害はここで防げます',
  },
];

/**
 * 都道府県 → 一般送配電事業者（停電情報の窓口）
 * 県境や河川で供給エリアが分かれる県には note を付けている。
 */
export const PREFECTURES = [
  { id: 'hokkaido', label: '北海道', power: 'hepco' },
  { id: 'aomori', label: '青森県', power: 'tohoku' },
  { id: 'iwate', label: '岩手県', power: 'tohoku' },
  { id: 'miyagi', label: '宮城県', power: 'tohoku' },
  { id: 'akita', label: '秋田県', power: 'tohoku' },
  { id: 'yamagata', label: '山形県', power: 'tohoku' },
  { id: 'fukushima', label: '福島県', power: 'tohoku' },
  { id: 'ibaraki', label: '茨城県', power: 'tepco' },
  { id: 'tochigi', label: '栃木県', power: 'tepco' },
  { id: 'gunma', label: '群馬県', power: 'tepco' },
  { id: 'saitama', label: '埼玉県', power: 'tepco' },
  { id: 'chiba', label: '千葉県', power: 'tepco' },
  { id: 'tokyo', label: '東京都', power: 'tepco' },
  { id: 'kanagawa', label: '神奈川県', power: 'tepco' },
  { id: 'niigata', label: '新潟県', power: 'tohoku' },
  { id: 'toyama', label: '富山県', power: 'rikuden' },
  { id: 'ishikawa', label: '石川県', power: 'rikuden' },
  { id: 'fukui', label: '福井県', power: 'rikuden', note: '嶺南地域の一部は関西電力送配電エリアです。' },
  { id: 'yamanashi', label: '山梨県', power: 'tepco' },
  { id: 'nagano', label: '長野県', power: 'chuden', note: '一部が東京電力パワーグリッドエリアです。' },
  { id: 'gifu', label: '岐阜県', power: 'chuden' },
  { id: 'shizuoka', label: '静岡県', power: 'chuden', note: '富士川以東は東京電力パワーグリッドエリアです。' },
  { id: 'aichi', label: '愛知県', power: 'chuden' },
  { id: 'mie', label: '三重県', power: 'chuden', note: '南部の一部は関西電力送配電エリアです。' },
  { id: 'shiga', label: '滋賀県', power: 'kansai' },
  { id: 'kyoto', label: '京都府', power: 'kansai' },
  { id: 'osaka', label: '大阪府', power: 'kansai' },
  { id: 'hyogo', label: '兵庫県', power: 'kansai' },
  { id: 'nara', label: '奈良県', power: 'kansai' },
  { id: 'wakayama', label: '和歌山県', power: 'kansai' },
  { id: 'tottori', label: '鳥取県', power: 'energia' },
  { id: 'shimane', label: '島根県', power: 'energia' },
  { id: 'okayama', label: '岡山県', power: 'energia' },
  { id: 'hiroshima', label: '広島県', power: 'energia' },
  { id: 'yamaguchi', label: '山口県', power: 'energia' },
  { id: 'tokushima', label: '徳島県', power: 'yonden' },
  { id: 'kagawa', label: '香川県', power: 'yonden' },
  { id: 'ehime', label: '愛媛県', power: 'yonden' },
  { id: 'kochi', label: '高知県', power: 'yonden' },
  { id: 'fukuoka', label: '福岡県', power: 'kyuden' },
  { id: 'saga', label: '佐賀県', power: 'kyuden' },
  { id: 'nagasaki', label: '長崎県', power: 'kyuden' },
  { id: 'kumamoto', label: '熊本県', power: 'kyuden' },
  { id: 'oita', label: '大分県', power: 'kyuden' },
  { id: 'miyazaki', label: '宮崎県', power: 'kyuden' },
  { id: 'kagoshima', label: '鹿児島県', power: 'kyuden' },
  { id: 'okinawa', label: '沖縄県', power: 'okiden' },
];

/** id から探すためのヘルパー（毎回 find を書かないため） */
export const bySituationId = (id) => SITUATIONS.find((s) => s.id === id);
export const byHouseholdId = (id) => HOUSEHOLDS.find((h) => h.id === id);
export const byPrefectureId = (id) => PREFECTURES.find((p) => p.id === id);
