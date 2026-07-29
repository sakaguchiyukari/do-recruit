/**
 * 避難所持ち物チェックリスト — 持ち物データ
 * -----------------------------------------------------------------------------
 * このファイルだけを編集すれば、リストの中身を更新できる。
 * 表示ロジック（app.js）とデータを分離しているのは、
 * 防災情報の見直し時にコードを読まずに直せるようにするため。
 *
 * ▼ 数量の根拠（内閣府・消防庁の一般的な備蓄指針に準拠）
 *   飲料水     … 1人1日3L
 *   非常食     … 最低3日分、可能なら7日分
 *   簡易トイレ … 1人1日5回
 *
 * ▼ item のスキーマ
 *   id    {string}   保存キーになる。一度公開したら変更しないこと（チェックが外れる）
 *   label {string}   品名
 *   note  {string}   なぜ必要か・選び方の一言。迷いを減らすための説明
 *   cat   {string}   CATEGORIES のキー
 *   pri   {string}   PRIORITIES のキー
 *   when  {string[]} 表示条件。いずれか1つでも該当すれば表示される
 *   qty   {Function} 人数などから目安量を算出する。不要なら省略可
 *
 * ※ classic script（type="module" ではない）で読み込む。
 *    停電時に配布フォルダを file:// で直接開いても動くようにするため。
 */
(function (global) {
  'use strict';

  /* ==========================================================================
     優先度
     「全部そろえなきゃ」と思わせないために、3段階に分ける。
     被災直後に見るべきは now だけでよい。
     ========================================================================== */
  var PRIORITIES = [
    {
      key: 'now',
      label: 'いま10分で持って出る',
      short: '0次',
      desc: '身につけて逃げるもの。これだけでも大丈夫です。',
    },
    {
      key: 'bag',
      label: '非常持ち出し袋',
      short: '1次',
      desc: '避難所での最初の数日を支えるもの。',
    },
    {
      key: 'later',
      label: '落ち着いてから',
      short: '2次',
      desc: '安全を確認できてから取りに戻る・買い足すもの。',
    },
  ];

  /* ==========================================================================
     カテゴリ
     絵文字を使うのは、疲れているときでも一目で塊を見分けられるようにするため。
     外部アイコンを読み込まない＝通信が無くても必ず表示される、という理由もある。
     ========================================================================== */
  var CATEGORIES = [
    { key: 'life', label: '水・食べもの', icon: '💧' },
    { key: 'power', label: '明かり・電源・情報', icon: '🔦' },
    { key: 'sanitary', label: '衛生・トイレ', icon: '🧻' },
    { key: 'body', label: '体を守る・防寒', icon: '🧥' },
    { key: 'valuables', label: '貴重品・書類', icon: '🪪' },
    { key: 'medical', label: '救急・くすり', icon: '🩹' },
    { key: 'baby', label: '赤ちゃん', icon: '🍼' },
    { key: 'senior', label: '高齢者・介護', icon: '🦯' },
    { key: 'child', label: '子ども', icon: '🧸' },
    { key: 'woman', label: '女性', icon: '🌸' },
    { key: 'pet', label: 'ペット', icon: '🐾' },
    { key: 'calm', label: '心を落ち着けるもの', icon: '🫧' },
  ];

  /* ==========================================================================
     表示条件
     世帯タイプ（単一選択）と 追加条件（複数選択）に分かれる。
     'base' は常に有効で、誰にとっても必要なものを表す。
     ========================================================================== */
  var HOUSEHOLDS = [
    { key: 'solo', label: '一人暮らし', people: 1 },
    { key: 'couple', label: 'ふたり暮らし', people: 2 },
    { key: 'family', label: '家族（子どもがいる）', people: 4 },
  ];

  var CONDITIONS = [
    { key: 'baby', label: '赤ちゃんがいる' },
    { key: 'senior', label: '高齢者がいる' },
    { key: 'pet', label: 'ペットがいる' },
    { key: 'woman', label: '女性がいる' },
    { key: 'medicine', label: '持病・常用薬がある' },
    { key: 'allergy', label: 'アレルギーがある' },
    { key: 'care', label: '配慮が必要な人がいる' },
  ];

  /* --------------------------------------------------------------------------
     数量ヘルパー
     c = { people, babies, seniors, pets, days }
     -------------------------------------------------------------------------- */
  var qtyWaterStock = function (c) {
    return '約' + c.people * 3 * c.days + 'L（1人1日3L × ' + c.days + '日）';
  };
  var qtyWaterBag = function (c) {
    return '500ml × ' + c.people * 3 + '本（1人3本）';
  };
  var qtyFood = function (c) {
    return c.people * 3 * c.days + '食（1人1日3食 × ' + c.days + '日）';
  };
  var qtyToilet = function (c) {
    return '約' + c.people * 5 * c.days + '回分（1人1日5回 × ' + c.days + '日）';
  };
  var qtyPerPerson = function (n, unit) {
    var u = unit || '個';
    return function (c) {
      return c.people * n + u + '（1人' + n + u + '）';
    };
  };
  var qtyPerPet = function (n, unit) {
    return function (c) {
      return c.pets * n + (unit || '個');
    };
  };

  /* ==========================================================================
     持ち物リスト
     ========================================================================== */
  var ITEMS = [
    /* ---------- いま10分で持って出る（0次） ---------------------------- */
    {
      id: 'now-shoes',
      label: '底の厚い靴・スニーカー',
      note: '室内でも必ず履く。割れたガラスでの足のけがが、避難できなくなる一番の原因です。',
      cat: 'body', pri: 'now', when: ['base'],
    },
    {
      id: 'now-phone',
      label: 'スマートフォン',
      note: '連絡・情報・明かり・記録すべてに使います。',
      cat: 'power', pri: 'now', when: ['base'],
    },
    {
      id: 'now-battery',
      label: 'モバイルバッテリー・充電ケーブル',
      note: '満充電のものを1つ。停電中はスマホの電池が命綱になります。',
      cat: 'power', pri: 'now', when: ['base'],
    },
    {
      id: 'now-wallet',
      label: '財布（現金・小銭）',
      note: '停電するとカードも電子マネーも使えません。小銭と千円札が役に立ちます。',
      cat: 'valuables', pri: 'now', when: ['base'],
    },
    {
      id: 'now-medicine',
      label: 'いつも飲んでいる薬・お薬手帳',
      note: '手帳の写真をスマホに撮っておくと、薬を持ち出せなくても処方してもらえます。',
      cat: 'medical', pri: 'now', when: ['base', 'medicine', 'senior'],
    },
    {
      id: 'now-glasses',
      label: 'メガネ・コンタクト用品',
      note: '避難所でコンタクトを外せないと目を痛めます。メガネがあると安心です。',
      cat: 'medical', pri: 'now', when: ['base'],
    },
    {
      id: 'now-light',
      label: '懐中電灯・ヘッドライト',
      note: '両手が空くヘッドライトが理想。スマホのライトは電池を大きく減らします。',
      cat: 'power', pri: 'now', when: ['base'],
    },
    {
      id: 'now-water',
      label: '飲みかけでいいので水',
      note: 'すぐ手に取れる分だけで十分。取りに戻らないでください。',
      cat: 'life', pri: 'now', when: ['base'],
    },
    {
      id: 'now-key',
      label: '家の鍵・車の鍵',
      note: '',
      cat: 'valuables', pri: 'now', when: ['base'],
    },
    {
      id: 'now-helmet',
      label: 'ヘルメット・防災ずきん',
      note: '余震での落下物から頭を守ります。無ければ厚い座布団やカバンでも代用できます。',
      cat: 'body', pri: 'now', when: ['base'],
    },
    {
      id: 'now-baby-carry',
      label: '抱っこひも',
      note: 'ベビーカーは段差やガラスで進めません。抱っこひもで両手を空けてください。',
      cat: 'baby', pri: 'now', when: ['baby'],
    },
    {
      id: 'now-pet-carry',
      label: 'キャリーバッグ・リード',
      note: '同行避難の前提条件です。パニックで飛び出すため、必ず入れる／つなぐこと。',
      cat: 'pet', pri: 'now', when: ['pet'],
    },
    {
      id: 'now-note',
      label: '行き先を書いた紙を玄関に残す',
      note: '「◯◯小学校へ避難／家族全員無事／◯時◯分」。これが家族の捜索を止めます。',
      cat: 'valuables', pri: 'now', when: ['base'],
    },

    /* ---------- 非常持ち出し袋（1次） ---------------------------------- */
    /* 水・食べもの */
    {
      id: 'bag-water',
      label: '飲料水（持ち出し用）',
      note: '重いので無理は禁物。500mlを分けて持つと、家族で分担できます。',
      cat: 'life', pri: 'bag', when: ['base'], qty: qtyWaterBag,
    },
    {
      id: 'bag-food',
      label: '非常食（そのまま食べられるもの）',
      note: '調理不要のものを。おにぎり・パン・カロリーメイト・レトルトなど。',
      cat: 'life', pri: 'bag', when: ['base'],
      qty: function (c) { return c.people * 3 + '食（まず1日分）'; },
    },
    {
      id: 'bag-sweets',
      label: 'チョコ・あめ・栄養補助食品',
      note: '甘いものは体力だけでなく気持ちも支えます。子どもがいるなら多めに。',
      cat: 'life', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-allergy-food',
      label: 'アレルギー対応食',
      note: '避難所の炊き出しは原材料が分からないことが多い。自分の分は自分で確保を。',
      cat: 'life', pri: 'bag', when: ['allergy'],
    },
    {
      id: 'bag-allergy-card',
      label: 'アレルギー表示カード',
      note: '「卵・乳アレルギーがあります」と書いて見えるところに。本人が話せない時に効きます。',
      cat: 'life', pri: 'bag', when: ['allergy'],
    },
    {
      id: 'bag-utensil',
      label: '紙皿・紙コップ・割り箸・ラップ',
      note: 'ラップを皿にかぶせて使うと、洗わずに済み、水を節約できます。',
      cat: 'life', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-opener',
      label: '缶切り・多機能ナイフ',
      note: '',
      cat: 'life', pri: 'bag', when: ['base'],
    },

    /* 明かり・電源・情報 */
    {
      id: 'bag-radio',
      label: '携帯ラジオ（手回し・乾電池式）',
      note: '通信が混雑してもラジオは届きます。地域の情報はラジオが一番早いことがあります。',
      cat: 'power', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-batteries',
      label: '予備の乾電池',
      note: 'ライトとラジオのサイズを確認してから。単3・単4が中心です。',
      cat: 'power', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-lantern',
      label: 'ランタン・LEDライト',
      note: '避難所の夜は暗く不安になります。足元をぼんやり照らす光があると眠れます。',
      cat: 'power', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-whistle',
      label: 'ホイッスル（笛）',
      note: '閉じ込められた時、声を出し続けるのは無理です。笛なら体力を使わず居場所を伝えられます。',
      cat: 'power', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-memo',
      label: 'メモ帳・油性ペン',
      note: '伝言、持ち物への名前書き、支援の受付番号。想像以上に使います。',
      cat: 'power', pri: 'bag', when: ['base'],
    },

    /* 衛生・トイレ */
    {
      id: 'bag-toilet',
      label: '携帯トイレ・簡易トイレ',
      note: '断水すると水洗が使えません。避難所のトイレは必ず不足します。最優先の備えです。',
      cat: 'sanitary', pri: 'bag', when: ['base'], qty: qtyToilet,
    },
    {
      id: 'bag-tissue',
      label: 'トイレットペーパー・ティッシュ',
      note: '芯を抜いて潰すとかさばりません。',
      cat: 'sanitary', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-wet',
      label: 'ウェットティッシュ・除菌シート',
      note: '水が使えない間、これが唯一の「洗う」手段になります。多めに。',
      cat: 'sanitary', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-bodywipe',
      label: '体拭きシート・ドライシャンプー',
      note: '数日お風呂に入れません。体を拭けるだけで気持ちがかなり楽になります。',
      cat: 'sanitary', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-mask',
      label: 'マスク',
      note: '粉じん対策と感染症対策。避難所は人が密集します。',
      cat: 'sanitary', pri: 'bag', when: ['base'], qty: qtyPerPerson(5, '枚'),
    },
    {
      id: 'bag-toothbrush',
      label: '歯ブラシ・液体歯みがき',
      note: '水が無くても使える液体タイプが便利。口腔ケアは高齢者の肺炎予防に直結します。',
      cat: 'sanitary', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-garbage',
      label: 'ゴミ袋・ポリ袋（大小）',
      note: '雨具、防寒、汚物入れ、水運び。1枚で何役もこなす万能品です。',
      cat: 'sanitary', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-handsan',
      label: '手指消毒液',
      note: '',
      cat: 'sanitary', pri: 'bag', when: ['base'],
    },

    /* 体を守る・防寒 */
    {
      id: 'bag-blanket',
      label: 'アルミブランケット',
      note: '薄く軽いのに驚くほど暖かい。1人1枚を袋に入れておいてください。',
      cat: 'body', pri: 'bag', when: ['base'], qty: qtyPerPerson(1, '枚'),
    },
    {
      id: 'bag-clothes',
      label: '着替え・下着・靴下',
      note: '濡れた服のままだと体温を奪われます。下着と靴下はとくに大切です。',
      cat: 'body', pri: 'bag', when: ['base'], qty: qtyPerPerson(1, '組'),
    },
    {
      id: 'bag-towel',
      label: 'タオル',
      note: '防寒、止血、枕、目隠し。何枚あっても困りません。',
      cat: 'body', pri: 'bag', when: ['base'], qty: qtyPerPerson(2, '枚'),
    },
    {
      id: 'bag-raincoat',
      label: 'レインコート・ポンチョ',
      note: '傘は片手がふさがり、風で使えません。上下わかれた雨具が理想です。',
      cat: 'body', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-gloves',
      label: '軍手・作業用手袋',
      note: 'がれきやガラスを触る場面が必ずあります。滑り止め付きを。',
      cat: 'body', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-warmer',
      label: '使い捨てカイロ',
      note: '避難所の床は驚くほど冷えます。腰・お腹に貼ると全身が温まります。',
      cat: 'body', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-mat',
      label: '銀マット・レジャーシート',
      note: '床の冷えを断つのが体調を守るコツ。場所の確保にも使えます。',
      cat: 'body', pri: 'bag', when: ['base'],
    },

    /* 貴重品・書類 */
    {
      id: 'bag-id',
      label: '身分証明書（コピーでも可）',
      note: '罹災証明や支援金の手続きで必要になります。コピーを袋に入れておくと安心です。',
      cat: 'valuables', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-insurance',
      label: '健康保険証（コピー可）',
      note: '無くても受診はできますが、あると手続きがずっと早く進みます。',
      cat: 'valuables', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-bankbook',
      label: '通帳・印鑑（または口座番号のメモ）',
      note: '通帳が無くても、口座番号と本人確認で引き出せる特別対応が取られます。',
      cat: 'valuables', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-contacts',
      label: '緊急連絡先を書いた紙',
      note: 'スマホの電池が切れると連絡先は一切見られません。紙に書き写してください。',
      cat: 'valuables', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-photo',
      label: '家族の顔写真',
      note: 'はぐれた時に人に見せて探せます。ペットの写真も同じ理由で有効です。',
      cat: 'valuables', pri: 'bag', when: ['base'],
    },

    /* 救急・くすり */
    {
      id: 'bag-firstaid',
      label: '救急セット（絆創膏・包帯・消毒）',
      note: '小さな傷でも、水が無いと化膿しやすくなります。',
      cat: 'medical', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-otc',
      label: '常備薬（痛み止め・胃薬・整腸剤）',
      note: '環境の変化でお腹を壊す人がとても多い。整腸剤は入れておいて損がありません。',
      cat: 'medical', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-rx',
      label: '処方薬（最低1週間分）',
      note: '処方薬は避難所ですぐには手に入りません。切らさないことを最優先に。',
      cat: 'medical', pri: 'bag', when: ['medicine', 'senior'],
    },
    {
      id: 'bag-thermo',
      label: '体温計',
      note: '',
      cat: 'medical', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-coolsheet',
      label: '冷却シート',
      note: '発熱時と、夏場の熱中症対策に。',
      cat: 'medical', pri: 'bag', when: ['base'],
    },

    /* 赤ちゃん */
    {
      id: 'bag-diaper',
      label: 'おむつ・おしりふき',
      note: '避難所に届く支援物資はサイズが合わないことが多い。使い慣れたものを多めに。',
      cat: 'baby', pri: 'bag', when: ['baby'],
      qty: function (c) { return c.babies * 10 * c.days + '枚（1日10枚 × ' + c.days + '日）'; },
    },
    {
      id: 'bag-milk',
      label: '液体ミルク・粉ミルク',
      note: '液体ミルクはお湯が要らず、そのまま飲ませられます。断水時の切り札です。',
      cat: 'baby', pri: 'bag', when: ['baby'],
    },
    {
      id: 'bag-bottle',
      label: '哺乳びん・使い捨て哺乳パック',
      note: '洗えないことを前提に、使い捨てタイプがあると安心です。',
      cat: 'baby', pri: 'bag', when: ['baby'],
    },
    {
      id: 'bag-babyfood',
      label: '離乳食・ベビーフード',
      note: '常温でそのまま食べられるパウチタイプを。',
      cat: 'baby', pri: 'bag', when: ['baby'],
    },
    {
      id: 'bag-babyclothes',
      label: '赤ちゃんの着替え・スタイ',
      note: '',
      cat: 'baby', pri: 'bag', when: ['baby'],
    },
    {
      id: 'bag-babytoy',
      label: 'お気に入りのおもちゃ・タオル',
      note: '泣き止まない時、いつもの匂いのするものが一番効きます。',
      cat: 'baby', pri: 'bag', when: ['baby'],
    },
    {
      id: 'bag-babynotebook',
      label: '母子健康手帳',
      note: '予防接種の記録は、避難先での受診時に必要になります。',
      cat: 'baby', pri: 'bag', when: ['baby'],
    },

    /* 子ども */
    {
      id: 'bag-childtoy',
      label: '絵本・おもちゃ・お絵かき帳',
      note: '「退屈」は子どもにとって大きなストレスです。気を紛らわせるものを必ず。',
      cat: 'child', pri: 'bag', when: ['family'],
    },
    {
      id: 'bag-childname',
      label: '名前・連絡先を書いたカード',
      note: '服の内側やポケットに。はぐれた時に子ども自身を助けます。',
      cat: 'child', pri: 'bag', when: ['family'],
    },

    /* 高齢者・介護 */
    {
      id: 'bag-adultdiaper',
      label: '大人用おむつ・尿とりパッド',
      note: '支援物資で最も不足しやすい品目のひとつです。',
      cat: 'senior', pri: 'bag', when: ['senior', 'care'],
    },
    {
      id: 'bag-denture',
      label: '入れ歯・洗浄剤',
      note: '入れ歯が無いと食べられず、体力が一気に落ちます。ケースも忘れずに。',
      cat: 'senior', pri: 'bag', when: ['senior'],
    },
    {
      id: 'bag-hearing',
      label: '補聴器・予備電池',
      note: '放送が聞こえないと、避難や配給の情報を逃してしまいます。',
      cat: 'senior', pri: 'bag', when: ['senior', 'care'],
    },
    {
      id: 'bag-softfood',
      label: '介護食・とろみ剤',
      note: '炊き出しは硬いものが中心です。飲み込みに不安がある方には必須。',
      cat: 'senior', pri: 'bag', when: ['senior', 'care'],
    },
    {
      id: 'bag-caresheet',
      label: '介護・配慮の内容を書いた紙',
      note: '「認知症があります」「車いすです」。周りに伝わるだけで支援が変わります。',
      cat: 'senior', pri: 'bag', when: ['senior', 'care'],
    },

    /* 女性 */
    {
      id: 'bag-sanitary',
      label: '生理用品',
      note: '支援物資では受け取りづらく、量も足りません。多めに自分で持ってください。',
      cat: 'woman', pri: 'bag', when: ['woman'],
    },
    {
      id: 'bag-cosme',
      label: '化粧品・スキンケア（最小限）',
      note: '「いつも通り」を少しでも保てることが、心の回復を早めます。',
      cat: 'woman', pri: 'bag', when: ['woman'],
    },
    {
      id: 'bag-innerwear',
      label: '替えの下着・使い捨てショーツ',
      note: '洗濯ができない期間が続きます。',
      cat: 'woman', pri: 'bag', when: ['woman'],
    },
    {
      id: 'bag-alarm',
      label: '防犯ブザー',
      note: '避難所や仮設トイレでの被害は実際に起きています。持っていて損はありません。',
      cat: 'woman', pri: 'bag', when: ['woman'],
    },

    /* ペット */
    {
      id: 'bag-petfood',
      label: 'ペットフード・水',
      note: 'ペット用の支援物資は届くのが遅れます。最低5日分を自分で用意してください。',
      cat: 'pet', pri: 'bag', when: ['pet'],
      qty: function (c) { return 'ペット' + c.pets + '匹 × 5日分'; },
    },
    {
      id: 'bag-petbowl',
      label: '食器・給水器',
      note: '',
      cat: 'pet', pri: 'bag', when: ['pet'], qty: qtyPerPet(1, 'セット'),
    },
    {
      id: 'bag-petsheet',
      label: 'ペットシーツ・猫砂・処理袋',
      note: '排泄の管理ができるかどうかで、避難所で受け入れてもらえるかが変わります。',
      cat: 'pet', pri: 'bag', when: ['pet'],
    },
    {
      id: 'bag-petmed',
      label: 'ペットの薬・療法食',
      note: '',
      cat: 'pet', pri: 'bag', when: ['pet'],
    },
    {
      id: 'bag-petinfo',
      label: 'ワクチン接種証明・鑑札・写真',
      note: '同行避難の受付で確認されます。写真ははぐれた時の捜索にも使えます。',
      cat: 'pet', pri: 'bag', when: ['pet'],
    },
    {
      id: 'bag-pettowel',
      label: 'ペット用タオル・洗濯ネット',
      note: '猫は洗濯ネットに入れると落ち着き、脱走も防げます。',
      cat: 'pet', pri: 'bag', when: ['pet'],
    },

    /* 心を落ち着けるもの */
    {
      id: 'bag-earplug',
      label: '耳栓・アイマスク',
      note: '避難所は明るく、音が絶えません。眠れないことが体調悪化の入口になります。',
      cat: 'calm', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-tea',
      label: 'お茶・インスタントの温かい飲み物',
      note: '温かいものを一口飲むと、体だけでなく気持ちがほどけます。',
      cat: 'calm', pri: 'bag', when: ['base'],
    },
    {
      id: 'bag-book',
      label: '本・イヤホン・トランプ',
      note: '待つ時間がとても長い。何かに集中できるものが、心を守ってくれます。',
      cat: 'calm', pri: 'bag', when: ['base'],
    },

    /* ---------- 落ち着いてから（2次） ---------------------------------- */
    {
      id: 'later-water',
      label: '飲料水の備蓄',
      note: '飲用だけでなく、歯みがきや手洗いにも要ります。',
      cat: 'life', pri: 'later', when: ['base'], qty: qtyWaterStock,
    },
    {
      id: 'later-food',
      label: '食料の備蓄（3日〜1週間分）',
      note: 'ふだん食べているものを多めに買い、古いものから使う「ローリングストック」が続けやすい方法です。',
      cat: 'life', pri: 'later', when: ['base'], qty: qtyFood,
    },
    {
      id: 'later-stove',
      label: 'カセットコンロ・ボンベ',
      note: '温かい食事が作れると、体調も気持ちも大きく変わります。ボンベは1日1本が目安。',
      cat: 'life', pri: 'later', when: ['base'],
    },
    {
      id: 'later-tank',
      label: '給水タンク・ポリタンク',
      note: '給水車から水をもらうために必要。無いと受け取れません。',
      cat: 'life', pri: 'later', when: ['base'],
    },
    {
      id: 'later-sleep',
      label: '寝袋・毛布・エアマット',
      note: '床で寝る日が続きます。睡眠の質が回復の速さを決めます。',
      cat: 'body', pri: 'later', when: ['base'],
    },
    {
      id: 'later-tent',
      label: 'テント・車中泊グッズ',
      note: '車中泊をする場合は、足を伸ばして寝られるようにしてください（エコノミークラス症候群の予防）。',
      cat: 'body', pri: 'later', when: ['base'],
    },
    {
      id: 'later-tools',
      label: '工具・ロープ・ガムテープ',
      note: '割れた窓の応急処置や、家財の固定に。ガムテープは補修と表示の両方に使えます。',
      cat: 'body', pri: 'later', when: ['base'],
    },
    {
      id: 'later-laundry',
      label: '洗濯ロープ・洗剤',
      note: '',
      cat: 'sanitary', pri: 'later', when: ['base'],
    },
    {
      id: 'later-camera',
      label: '被害状況を撮った写真',
      note: '罹災証明の申請に使います。片付ける前に、家の外と内を広く撮っておいてください。',
      cat: 'valuables', pri: 'later', when: ['base'],
    },
    {
      id: 'later-cash',
      label: '現金の買い足し',
      note: '停電・通信障害の間はキャッシュレスが一切使えません。',
      cat: 'valuables', pri: 'later', when: ['base'],
    },
  ];

  global.EvacData = {
    PRIORITIES: PRIORITIES,
    CATEGORIES: CATEGORIES,
    HOUSEHOLDS: HOUSEHOLDS,
    CONDITIONS: CONDITIONS,
    ITEMS: ITEMS,
  };
})(window);
