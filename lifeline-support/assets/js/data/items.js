/**
 * ライフラインサポート — 対策コンテンツ本体
 * -----------------------------------------------------------------------------
 * 1件 = 1枚のカード。ホーム画面の絞り込みと「ライフハック集」の両方が
 * このファイルだけを情報源にしている（二重管理をしないための約束）。
 *
 * ■ データ構造
 *   id          … 一意。チェック状態の保存キーになるため、公開後に変更しない。
 *   kind        … 'now'（今すぐやること）/ 'hack'（工夫）/ 'caution'（命に関わる注意）
 *   situations  … 対象の状況 id。1つでも選ばれていれば表示（OR）。
 *   households  … 対象の世帯条件 id。1つでも選ばれていれば表示（OR）。
 *                 situations と両方ある場合は AND 条件になる。
 *   combo       … 指定した状況が「すべて」選ばれたときだけ表示し、最上位に出す。
 *   priority    … 1〜5。小さいほど上に出る。1 は命に直結するもの。
 *   title       … 一目で行動が分かる短い文（20文字前後）。
 *   body        … 補足。数字を入れて「どれくらい」まで書く。
 *
 * ■ 執筆ルール
 *   ・「〜しましょう」ではなく「〜する」で言い切る（緊急時に読む文章のため）
 *   ・目安の数値は必ず単位付きで書く（1人1日3L、5〜8L など）
 *   ・危険を伴う代用手段には必ず caution を対にして置く
 */

export const ITEMS = [
  /* =========================================================================
     停電
     ====================================================================== */
  {
    id: 'bo-now-01',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 1,
    title: 'スマホを省電力モードにし、画面を最も暗くする',
    body: '画面の明るさは電池消費の最大要因。省電力モード＋最低輝度＋通知オフで、体感の持ち時間が2倍近くになる。',
  },
  {
    id: 'bo-now-02',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 1,
    title: 'モバイルバッテリーの残量を数え、使う順番を決める',
    body: '「今日使う1本」「明日以降の予備」を分ける。家族全員のスマホを同時に充電しない。連絡係を1台に絞ると全体の電池が長持ちする。',
  },
  {
    id: 'bo-now-03',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 1,
    title: '使っていた電熱器具のスイッチを切り、プラグを抜く',
    body: '電気ストーブ・アイロン・ドライヤーなど。復旧した瞬間に無人で再稼働して火が出るのが「通電火災」。家を離れるときはブレーカーも落とす。',
  },
  {
    id: 'bo-now-04',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: '冷蔵庫・冷凍庫のドアを開けない',
    body: '開けなければ冷蔵室は2〜3時間、冷凍室は食品が詰まっていれば半日〜1日程度は保つ。開ける回数を減らすため、先に「何をいつ食べるか」を決めてから一度で取り出す。',
  },
  {
    id: 'bo-now-05',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: '明かりはLEDライトにする。ろうそくは使わない',
    body: '余震で倒れれば火災になる。懐中電灯・ランタン・ヘッドライトを使い、就寝時に裸火を残さない。',
  },
  {
    id: 'bo-now-06',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: 'エレベーターを使わない',
    body: '復旧と停止を繰り返す段階では閉じ込めが起きる。すでに乗っている場合は全部の階のボタンを押し、停まった階で降りる。',
  },
  {
    id: 'bo-now-07',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 3,
    title: '水が出るうちに、浴槽とやかん・鍋に水をためる',
    body: 'マンションは受水槽のポンプが電気で動くため、停電がそのまま断水になることが多い。停電を確認したら真っ先に水をためる。',
  },
  {
    id: 'bo-now-08',
    kind: 'now',
    situations: ['blackout'],
    households: [],
    priority: 3,
    title: '情報源をラジオに切り替える',
    body: '乾電池式・手回しラジオがあればスマホの電池を温存できる。スマホのラジオアプリは通信と画面を使うため消耗が早い。',
  },
  {
    id: 'bo-hack-01',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: '車はいちばん大きなモバイルバッテリー',
    body: 'シガーソケットのUSB充電器で複数台を充電できる。ガソリンは移動と暖房のためにも使うので、充電は必要な分だけに。',
  },
  {
    id: 'bo-hack-02',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: '懐中電灯＋水の入ったペットボトルでランタンになる',
    body: 'ライトの発光面に水入りペットボトルを立てると光が拡散し、部屋全体がぼんやり明るくなる。レジ袋をかぶせても同じ効果がある。',
  },
  {
    id: 'bo-hack-03',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: 'ヘッドライトを1人1個。両手が空くのが正義',
    body: '暗い中での調理・片付け・トイレはすべて両手を使う。懐中電灯を口にくわえる状態は転倒につながる。',
  },
  {
    id: 'bo-hack-04',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: '保冷剤と冷凍食品を保冷バッグに集めて「小さな冷蔵庫」を作る',
    body: 'よく使うものだけを保冷バッグに移せば、冷蔵庫を開ける回数が激減する。凍った保冷剤は溶けるまで数時間、庫内を冷やし続ける。',
  },
  {
    id: 'bo-hack-05',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 3,
    title: '日中はカーテンを開け、夜は一部屋に集まる',
    body: '明かりも暖房も1か所に集約すると、電池も燃料も体力も節約できる。子どもや高齢者の様子にも気づきやすい。',
  },
  {
    id: 'bo-hack-06',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 3,
    title: '食べる順番は「冷蔵 → 冷凍 → 常温」',
    body: '傷みやすいものから消費する。冷凍食品は自然解凍されながら保冷剤の役目も果たすので、最後まで庫内に置いておく。',
  },
  {
    id: 'bo-hack-07',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 3,
    title: '給湯器・エコキュート・電気コンロは動かない前提で考える',
    body: 'ガスが生きていても給湯器は電気で制御されているため、停電中はお湯が出ない。体を拭くシートやドライシャンプーで代替する。',
  },
  {
    id: 'bo-hack-08',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 3,
    title: '電動シャッター・オートロック・電動自転車の手動対応を確認',
    body: '電動シャッターと立体駐車場には手動解錠の手順がある。明るいうちに取扱説明書の該当ページを写真に撮っておく。',
  },
  {
    id: 'bo-hack-09',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 4,
    title: '光回線の固定電話・インターホンも止まる',
    body: 'ひかり電話・IP電話は停電で使えない。訪問者が来ても呼び鈴は鳴らないため、玄関先に張り紙をしておくと安否確認がしやすい。',
  },
  {
    id: 'bo-hack-10',
    kind: 'hack',
    situations: ['blackout'],
    households: [],
    priority: 4,
    title: '夏は保冷、冬は着る。エアコンに頼らない体温管理',
    body: '夏は濡らしたタオルと保冷剤を首・脇・脚の付け根に。冬は重ね着＋毛布＋段ボールで床からの冷えを断つ。室温より「体に触れるもの」を変えるほうが効く。',
  },
  {
    id: 'bo-caution-01',
    kind: 'caution',
    situations: ['blackout'],
    households: [],
    priority: 1,
    title: '発電機・カセットコンロ・炭を室内で使わない',
    body: '一酸化炭素は無色無臭で、気づいたときには動けなくなる。発電機は必ず屋外に置き、屋内で火を使うときは必ず窓を開けて換気する。',
  },
  {
    id: 'bo-caution-02',
    kind: 'caution',
    situations: ['blackout'],
    households: [],
    priority: 1,
    title: '通電火災に備え、避難時は必ずブレーカーを落とす',
    body: '過去の地震では、電気の復旧後に起きた火災が出火原因の大きな割合を占めている。家を空けるときはブレーカーOFFを最後の動作にする。',
  },
  {
    id: 'bo-caution-03',
    kind: 'caution',
    situations: ['blackout'],
    households: [],
    priority: 2,
    title: '車中でエンジンをかけ続けるときは排気口の周りを空ける',
    body: '雪や瓦礫でマフラーがふさがると排ガスが車内に流れ込む。定期的に外へ出て確認し、寝るときはエンジンを切る。長時間同じ姿勢はエコノミークラス症候群の原因にもなる。',
  },
  {
    id: 'bo-caution-04',
    kind: 'caution',
    situations: ['blackout'],
    households: [],
    priority: 3,
    title: '停電から復旧した冷蔵庫の中身を、においだけで判断しない',
    body: '生鮮品が10℃以上の状態に2時間以上あったら処分を検討する。食中毒は断水中の在宅避難でいちばん避けたい事態。',
  },

  /* =========================================================================
     断水
     ====================================================================== */
  {
    id: 'wa-now-01',
    kind: 'now',
    situations: ['water'],
    households: [],
    priority: 1,
    title: '浴槽・バケツに残っている水を絶対に捨てない',
    body: 'トイレ・掃除・手洗いに使う生活用水になる。飲用には使わないと決めて、フタをして確保しておく。',
  },
  {
    id: 'wa-now-02',
    kind: 'now',
    situations: ['water'],
    households: [],
    priority: 1,
    title: '「飲む水」と「生活用水」の容器を物理的に分ける',
    body: '容器に油性ペンで「飲」「生活」と大きく書く。一度でも生活用水に使った容器は飲用に戻さない。家族全員が一目で分かる状態にしておく。',
  },
  {
    id: 'wa-now-03',
    kind: 'now',
    situations: ['water'],
    households: [],
    priority: 1,
    title: '飲料水は1人1日3Lで計算し、残り日数を出す',
    body: '飲用と調理を合わせた目安。4人家族なら1日12L、3日で36L。手元の量を数えて「あと何日か」を先に知ると、判断が落ち着く。',
  },
  {
    id: 'wa-now-04',
    kind: 'now',
    situations: ['water'],
    households: [],
    priority: 2,
    title: '給水所の場所・開設時間・持参する容器を確認する',
    body: '自治体の水道局やSNSで発表される。並ぶ前に容器と運搬手段（台車・キャリーカート）を用意しておくと往復の回数が減る。',
  },
  {
    id: 'wa-now-05',
    kind: 'now',
    situations: ['water'],
    households: [],
    priority: 2,
    title: '手を洗えない前提で衛生ルールを決める',
    body: 'アルコール消毒とウェットティッシュをトイレ・食事の動線に置く。「食事の前」「トイレの後」の2回だけは必ず、と家族で決めておく。',
  },
  {
    id: 'wa-hack-01',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 1,
    title: '皿にラップを敷いて食べる。洗い物をゼロにする',
    body: '食べ終わったらラップだけ捨てる。ポリ袋を皿にかぶせても同じ。断水中の「洗う水」は生活用水の中でも真っ先に節約すべき部分。',
  },
  {
    id: 'wa-hack-02',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 1,
    title: 'ポリ袋調理なら、鍋の水を繰り返し使える',
    body: '高密度ポリエチレンの袋に材料を入れて空気を抜き、口を固く結んで鍋で湯せんする。鍋の水は汚れないので何度でも使え、同じ鍋で複数のメニューを同時に作れる。',
  },
  {
    id: 'wa-hack-03',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 2,
    title: 'ペットボトルのキャップに穴を開けて簡易蛇口にする',
    body: '直接注ぐより水量を細かく調整でき、手洗いや歯みがきの水を10分の1程度に抑えられる。逆さにして片手で使えるのも利点。',
  },
  {
    id: 'wa-hack-04',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 2,
    title: '段ボール＋厚手のポリ袋で、即席の給水タンクが作れる',
    body: '段ボール箱に大きめのポリ袋を二重に入れて水を注ぐ。専用のポリタンクがなくても20L近く運べる。台車があると腰を痛めずに済む。',
  },
  {
    id: 'wa-hack-05',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 2,
    title: '体を洗えない期間は「拭く」に切り替える',
    body: '大判のボディシート、ドライシャンプー、蒸しタオル（少量の水を温めて絞る）。特に足と首まわりを拭くと体感が大きく変わり、睡眠の質が上がる。',
  },
  {
    id: 'wa-hack-06',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 3,
    title: '紙皿・紙コップ・割り箸は「衛生用品」として備える',
    body: '断水時の食器は消耗品と割り切る。1人1日3セットで計算し、家族×日数分を確保しておく。',
  },
  {
    id: 'wa-hack-07',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 3,
    title: '洗い物は「拭き取ってから」。汚れは水で落とさない',
    body: 'キッチンペーパーや新聞紙で油と食べ残しを拭き取れば、すすぐ水はごくわずかで済む。復旧後の排水管の詰まり防止にもなる。',
  },
  {
    id: 'wa-hack-08',
    kind: 'hack',
    situations: ['water'],
    households: [],
    priority: 3,
    title: '洗濯はしない前提。下着と靴下を多めに用意する',
    body: '在宅避難で最初に困るのが衣類。使い捨ての下着や、水なしで使える洗濯シートが役に立つ。汗をかいた衣類は乾かしてから畳むと臭いが抑えられる。',
  },
  {
    id: 'wa-caution-01',
    kind: 'caution',
    situations: ['water'],
    households: [],
    priority: 1,
    title: '井戸水・川の水・貯水槽の水を、消毒せずに飲まない',
    body: '見た目が澄んでいても細菌や化学物質を含むことがある。断水下での下痢は脱水に直結し、医療機関にもかかりにくい。',
  },
  {
    id: 'wa-caution-02',
    kind: 'caution',
    situations: ['water'],
    households: [],
    priority: 2,
    title: '復旧直後の濁った水は、透明になるまで飲用・洗濯に使わない',
    body: '配管内のさびや空気が混じる。しばらく流して透明になり、においが無くなってから使う。心配なときは自治体の水道局の案内を確認する。',
  },
  {
    id: 'wa-caution-03',
    kind: 'caution',
    situations: ['water'],
    households: [],
    priority: 3,
    title: '口を付けたペットボトルの水は、その日のうちに飲みきる',
    body: '口の中の細菌が入り、常温では急速に増える。飲みかけは名前を書いて各自が管理し、共用の飲料水はコップに移して飲む。',
  },

  /* =========================================================================
     トイレ
     ====================================================================== */
  {
    id: 'to-now-01',
    kind: 'now',
    situations: ['toilet'],
    households: [],
    priority: 1,
    title: '排水管の無事が確認できるまで、水を流さない',
    body: '地震で配管が壊れていると、汚水が階下や自室の床に逆流する。集合住宅では自分の1回の水洗が下の階の被害になる。管理会社・自治体の確認が取れるまで流さない。',
  },
  {
    id: 'to-now-02',
    kind: 'now',
    situations: ['toilet'],
    households: [],
    priority: 1,
    title: '便座にポリ袋を二重にかけ、吸収材を入れて簡易トイレにする',
    body: '1枚目は便器を覆う保護用（付けたまま）、2枚目が使い捨て。2枚目の中に凝固剤・新聞紙・ペットシーツを入れる。用を足したら2枚目だけを縛って捨てる。',
  },
  {
    id: 'to-now-03',
    kind: 'now',
    situations: ['toilet'],
    households: [],
    priority: 1,
    title: '使用後の袋は口を固く結び、フタ付き容器にまとめる',
    body: 'ゴミ収集が再開するまで数日〜数週間かかることがある。防臭袋やペール缶に入れ、直射日光の当たらない屋外に置く。',
  },
  {
    id: 'to-now-04',
    kind: 'now',
    situations: ['toilet'],
    households: [],
    priority: 2,
    title: '必要な回数を計算する。1人1日5回が目安',
    body: '4人家族の1週間なら140回分。袋・凝固剤・防臭袋がその数だけ要る。足りない分は代用品（新聞紙・猫砂・ペットシーツ）で補う計画を今立てる。',
  },
  {
    id: 'to-hack-01',
    kind: 'hack',
    situations: ['toilet'],
    households: [],
    priority: 1,
    title: '凝固剤の代用は、猫砂・ペットシーツ・新聞紙・紙おむつ',
    body: '吸水するものなら代用できる。新聞紙は細かくちぎるほど吸う。丸めたものを底に敷き、その上から使う。',
  },
  {
    id: 'to-hack-02',
    kind: 'hack',
    situations: ['toilet'],
    households: [],
    priority: 2,
    title: 'においは「密閉」と「重曹」で抑える',
    body: '袋の口を空気を抜いて固く結ぶのが最も効く。防臭袋があれば理想的。重曹や新聞紙を一緒に入れると、においの立ち上がりが遅くなる。',
  },
  {
    id: 'to-hack-03',
    kind: 'hack',
    situations: ['toilet'],
    households: [],
    priority: 2,
    title: 'アルコールとウェットティッシュをトイレの真横に固定配置する',
    body: '断水中の感染症は、トイレから食卓へ手で運ばれる。「トイレを出る前に必ず消毒」を家族のルールにし、道具を動かさない。',
  },
  {
    id: 'to-hack-04',
    kind: 'hack',
    situations: ['toilet'],
    households: [],
    priority: 3,
    title: '夜間用の簡易トイレを、寝る場所の近くに置く',
    body: '暗い中の移動は転倒の原因になる。段ボール製の簡易便座や、バケツ＋ポリ袋で足りる。目隠しのために大判のポンチョやレジャーシートを用意する。',
  },
  {
    id: 'to-caution-01',
    kind: 'caution',
    situations: ['toilet'],
    households: [],
    priority: 1,
    title: 'トイレを我慢するために水分を控えない',
    body: '脱水・血栓（エコノミークラス症候群）・膀胱炎・便秘を招き、命に関わる。水分は普段どおり取り、その分だけ排泄の準備を厚くする。',
  },
  {
    id: 'to-caution-02',
    kind: 'caution',
    situations: ['toilet'],
    households: [],
    priority: 2,
    title: '汚物の処理担当を決め、使い捨て手袋を使う',
    body: 'ノロウイルスなどは家庭内で一気に広がる。担当者を固定し、処理のあとは必ず手指消毒。嘔吐物の処理にも同じ道具を使う。',
  },

  /* =========================================================================
     通信障害
     ====================================================================== */
  {
    id: 'co-now-01',
    kind: 'now',
    situations: ['comms'],
    households: [],
    priority: 1,
    title: '緊急通報（110・118・119）は圏外表示でも試す',
    body: '契約している回線が使えなくても、他社の基地局につながって発信できる場合がある。命に関わるときは「圏外だから無理」と諦めない。',
  },
  {
    id: 'co-now-02',
    kind: 'now',
    situations: ['comms'],
    households: [],
    priority: 1,
    title: '通話ではなくSMS・メッセージアプリのテキストで連絡する',
    body: '音声通話は回線が混み合うと真っ先につながらなくなる。テキストは少ないデータ量で、電波が一瞬でも届けば送信される。',
  },
  {
    id: 'co-now-03',
    kind: 'now',
    situations: ['comms'],
    households: [],
    priority: 1,
    title: '安否は災害用伝言ダイヤル（171）・web171・各社の災害用伝言板へ',
    body: '「無事」の一言を1か所に置けば、家族全員がそこを見に行けばよくなる。個別の連絡を減らすことが、結果的にいちばん早い。',
  },
  {
    id: 'co-now-04',
    kind: 'now',
    situations: ['comms'],
    households: [],
    priority: 2,
    title: '機内モードのON/OFFで再接続を試す',
    body: '一度切って戻すと基地局を探し直す。それでもつながらないなら、機内モードのままにして電池を守る。圏外のまま置くと、電波を探し続けて急速に消耗する。',
  },
  {
    id: 'co-hack-01',
    kind: 'hack',
    situations: ['comms'],
    households: [],
    priority: 1,
    title: '00000JAPAN（ファイブゼロジャパン）を確認する',
    body: '大規模災害時に、携帯各社や施設が誰でも使える無料Wi-Fiとして開放することがある。Wi-Fi設定の一覧に出ていれば、パスワードなしで接続できる。',
  },
  {
    id: 'co-hack-02',
    kind: 'hack',
    situations: ['comms'],
    households: [],
    priority: 2,
    title: '連絡は「時刻を決めて1日2回」に集約する',
    body: '安否確認のたびに画面を点けると電池が尽きる。朝と夕方など時間を決め、その時だけ確認・送信する。家族にもその時間を伝えておく。',
  },
  {
    id: 'co-hack-03',
    kind: 'hack',
    situations: ['comms'],
    households: [],
    priority: 2,
    title: '遠くに住む親戚を「安否の中継役」にする',
    body: '被災地の中どうしは回線が混み合う。被災地の外に1人だけ中継役を決め、全員がその人に連絡すれば、少ない通信で全体の状況が共有できる。',
  },
  {
    id: 'co-hack-04',
    kind: 'hack',
    situations: ['comms'],
    households: [],
    priority: 3,
    title: '公衆電話の場所を確認する。10円玉とテレホンカードを持つ',
    body: '公衆電話は災害時に優先的につながる回線として扱われ、無料開放されることもある。ただし停電時は硬貨のみで、テレホンカードが使えない機種がある。',
  },
  {
    id: 'co-hack-05',
    kind: 'hack',
    situations: ['comms'],
    households: [],
    priority: 3,
    title: '地図・資料はダウンロードしてから外に出る',
    body: '地図アプリのオフライン地図、避難所一覧のPDF、このアプリのようなオフライン対応ページ。通信が生きているうちに端末へ落としておく。',
  },
  {
    id: 'co-caution-01',
    kind: 'caution',
    situations: ['comms'],
    households: [],
    priority: 1,
    title: '00000JAPAN は暗号化されていない。ID・パスワード・決済情報を入力しない',
    body: '誰でもつなげる代わりに通信内容が保護されない。安否確認や公式情報の閲覧に使い、ネットバンキングや買い物には使わない。',
  },
  {
    id: 'co-caution-02',
    kind: 'caution',
    situations: ['comms'],
    households: [],
    priority: 2,
    title: '出所の分からない情報を転送しない',
    body: '災害のたびに「〇〇が危ない」という未確認情報が広がる。発信元が公的機関か報道機関かを確かめ、確かめられないものは自分で止める。',
  },

  /* =========================================================================
     ガス停止
     ====================================================================== */
  {
    id: 'ga-now-01',
    kind: 'now',
    situations: ['gas'],
    households: [],
    priority: 1,
    title: 'ガスのにおいがしたら、火も電気スイッチも触らずに窓を開ける',
    body: '換気扇のスイッチ、照明、インターホンの操作でも火花が出て引火する。窓と扉を開け、元栓を閉め、屋外に出てからガス会社へ連絡する。',
  },
  {
    id: 'ga-now-02',
    kind: 'now',
    situations: ['gas'],
    households: [],
    priority: 2,
    title: 'マイコンメーターの復帰操作を確認する',
    body: '地震の揺れでガスメーターが安全のために自動遮断していることがある。赤いランプが点滅していれば、表示に従って自分で復帰できる場合がある。手順はメーター本体かガス会社の案内に従う。',
  },
  {
    id: 'ga-now-03',
    kind: 'now',
    situations: ['gas'],
    households: [],
    priority: 2,
    title: 'カセットコンロとボンベの本数を数える',
    body: 'ボンベ1本で強火なら約1時間が目安。1週間の在宅避難なら6〜10本あると安心できる。使い切る前に本数を把握しておくと、調理の計画が立てられる。',
  },
  {
    id: 'ga-now-04',
    kind: 'now',
    situations: ['gas'],
    households: [],
    priority: 3,
    title: 'お風呂とお湯は使えない前提に切り替える',
    body: '都市ガスの復旧は1軒ずつの安全確認が必要なため、電気や水道より時間がかかることが多い。体を拭く・湯たんぽで温まる方法に早めに切り替える。',
  },
  {
    id: 'ga-hack-01',
    kind: 'hack',
    situations: ['gas'],
    households: [],
    priority: 2,
    title: '「温かい汁物1杯」を1日1回は確保する',
    body: '限られた燃料の使いどころ。温かいものを口にすると体温も気力も戻る。汁物なら水分も同時に取れて、洗い物も1つで済む。',
  },
  {
    id: 'ga-hack-02',
    kind: 'hack',
    situations: ['gas'],
    households: [],
    priority: 3,
    title: '電気が生きているなら、電気ケトル・電子レンジ・炊飯器が代役になる',
    body: 'ガスだけが止まっている状況では、加熱手段は残っている。使える家電を書き出しておくと、無駄にボンベを消費しない。',
  },
  {
    id: 'ga-hack-03',
    kind: 'hack',
    situations: ['gas'],
    households: [],
    priority: 3,
    title: '湯たんぽ・カイロ・着る毛布で暖を取る',
    body: '空間を暖めるのではなく、体に触れるものを暖める。ペットボトル（熱湯対応のもの）にお湯を入れてタオルで包めば簡易湯たんぽになる。',
  },
  {
    id: 'ga-caution-01',
    kind: 'caution',
    situations: ['gas'],
    households: [],
    priority: 1,
    title: 'カセットコンロを2台並べて大きな鉄板や鍋を乗せない',
    body: '隣のボンベが加熱されて破裂する。コンロより大きい調理器具も、輻射熱でボンベを温めるため使わない。',
  },
  {
    id: 'ga-caution-02',
    kind: 'caution',
    situations: ['gas'],
    households: [],
    priority: 1,
    title: 'ボンベは使用後に外し、車内や暖房の近くに置かない',
    body: '直射日光の当たる車内は40℃を超える。ボンベの保管は直射日光を避けた40℃以下の場所と決められている。',
  },
  {
    id: 'ga-caution-03',
    kind: 'caution',
    situations: ['gas'],
    households: [],
    priority: 2,
    title: '復旧作業を名乗る訪問者に、その場で料金を払わない',
    body: '災害後は点検や修理を装う訪問が増える。ガス会社の作業員は身分証を携帯している。不安なときは契約しているガス会社に電話で確認する。',
  },

  /* =========================================================================
     食料不足
     ====================================================================== */
  {
    id: 'fo-now-01',
    kind: 'now',
    situations: ['food'],
    households: [],
    priority: 1,
    title: '家にある食べ物を全部出して床に並べる',
    body: '冷蔵庫・戸棚・防災リュック・菓子箱まで全部。見えるようにすると「あと何日分あるか」が分かり、無駄な不安と無駄な消費が同時に減る。',
  },
  {
    id: 'fo-now-02',
    kind: 'now',
    situations: ['food'],
    households: [],
    priority: 1,
    title: '食べる順番を紙に書く。冷蔵 → 冷凍 → 常温',
    body: '傷みやすい順に消費する。書いて貼っておけば、家族の誰が開けても同じ判断ができる。',
  },
  {
    id: 'fo-now-03',
    kind: 'now',
    situations: ['food'],
    households: [],
    priority: 2,
    title: '1日に必要な量の下限を決める',
    body: '成人でおよそ1日2,000kcal、水3Lが目安。厳しいときも、子ども・高齢者・持病のある人の分を先に確保してから残りを分ける。',
  },
  {
    id: 'fo-now-04',
    kind: 'now',
    situations: ['food'],
    households: [],
    priority: 2,
    title: '炊き出し・配給の情報を確認する',
    body: '在宅避難でも、最寄りの避難所で配給を受けられることが多い。自治体の発表や避難所の掲示で、時間と対象を確認する。',
  },
  {
    id: 'fo-hack-01',
    kind: 'hack',
    situations: ['food'],
    households: [],
    priority: 1,
    title: 'ポリ袋調理ならご飯も炊ける',
    body: '米1：水1.2の割合で高密度ポリエチレン袋に入れ、空気を抜いて口を結び、沸騰した鍋で約20〜30分湯せんし、10分蒸らす。鍋の水は汚れないので使い回せる。',
  },
  {
    id: 'fo-hack-02',
    kind: 'hack',
    situations: ['food'],
    households: [],
    priority: 2,
    title: '調味料があるだけで、同じ食材が続いても食べられる',
    body: '塩・砂糖・しょうゆ・みそ・マヨネーズ・ふりかけ。味が変わるだけで食欲が戻る。缶詰やアルファ米に加えるだけでよい。',
  },
  {
    id: 'fo-hack-03',
    kind: 'hack',
    situations: ['food'],
    households: [],
    priority: 2,
    title: 'チョコ・ようかん・ビスケットは「気力の食料」として温存する',
    body: '高カロリーで水がいらず、日持ちする。落ち込んだとき、寒いとき、子どもが不安なときのために少し残しておく。',
  },
  {
    id: 'fo-hack-04',
    kind: 'hack',
    situations: ['food'],
    households: [],
    priority: 3,
    title: '缶詰の汁は捨てない',
    body: '塩分と栄養が溶けている。スープや雑炊のだしとして使えば、貴重な水と調味料の節約になる。',
  },
  {
    id: 'fo-hack-05',
    kind: 'hack',
    situations: ['food'],
    households: [],
    priority: 3,
    title: '食べたものと日付をメモしておく',
    body: '体調を崩したときの原因の手がかりになり、支援物資の要望を伝えるときにも役立つ。「何が足りないか」を数字で言えると支援は届きやすい。',
  },
  {
    id: 'fo-caution-01',
    kind: 'caution',
    situations: ['food'],
    households: [],
    priority: 1,
    title: 'アレルギーのある人の食料は、配給に頼らず自分で確保する',
    body: '配給の食品は原材料表示が分からないことがある。アレルギー対応食は家庭で1週間分を確保し、本人が食べられるものをリストにして持ち歩く。',
  },
  {
    id: 'fo-caution-02',
    kind: 'caution',
    situations: ['food'],
    households: [],
    priority: 2,
    title: '「もったいない」で傷んだものを食べない',
    body: '断水・通信障害の中での食中毒は、脱水と受診困難が重なって深刻になる。少しでも異常を感じたら食べない。',
  },
  {
    id: 'fo-caution-03',
    kind: 'caution',
    situations: ['food'],
    households: [],
    priority: 2,
    title: '開けた缶詰・レトルトはその場で食べきる',
    body: '冷蔵保存ができない前提で、1回で食べきれる量を開ける。家族の人数に合わせてサイズを選ぶ。',
  },

  /* =========================================================================
     組み合わせ（複数の状況が重なったとき最優先で出す）
     ====================================================================== */
  {
    id: 'cb-bo-wa-01',
    kind: 'now',
    situations: ['blackout', 'water'],
    households: [],
    combo: ['blackout', 'water'],
    priority: 1,
    title: '【停電＋断水】加熱も水も要らない食品を最優先で食べる',
    body: 'そのまま食べられる缶詰、パン、シリアル、ゼリー飲料。調理は「1日1回、温かいものを作る」だけに絞り、水と燃料を残す。',
  },
  {
    id: 'cb-bo-wa-02',
    kind: 'now',
    situations: ['blackout', 'water'],
    households: [],
    combo: ['blackout', 'water'],
    priority: 1,
    title: '【停電＋断水】マンションは受水槽のポンプ停止が原因かもしれない',
    body: '停電が原因の断水なら、電気の復旧とともに水も戻る。管理会社に確認できれば、給水所に並ぶ前に見通しが立つ。',
  },
  {
    id: 'cb-wa-to-01',
    kind: 'now',
    situations: ['water', 'toilet'],
    households: [],
    combo: ['water', 'toilet'],
    priority: 1,
    title: '【断水＋トイレ】浴槽の水でトイレを流す前に、配管の無事を確認する',
    body: '水があっても、配管が壊れていれば流してはいけない。確認が取れるまでは袋式の簡易トイレを使い、浴槽の水は手洗いと掃除に回す。',
  },
  {
    id: 'cb-bo-co-01',
    kind: 'now',
    situations: ['blackout', 'comms'],
    households: [],
    combo: ['blackout', 'comms'],
    priority: 1,
    title: '【停電＋通信障害】スマホは1台だけ「連絡係」にして、他は電源を切る',
    body: '充電手段がない中で全員が電波を探すと、家族全体の通信手段が同時に尽きる。1台を残し、他は完全に電源オフにして予備電源にする。',
  },
  {
    id: 'cb-bo-fo-01',
    kind: 'hack',
    situations: ['blackout', 'food'],
    households: [],
    combo: ['blackout', 'food'],
    priority: 1,
    title: '【停電＋食料不足】冷凍庫は開ける前に献立を決める',
    body: '溶けはじめた冷凍食品は最優先で消費する。1回開けるごとに庫内温度が上がるので、取り出すものを紙に書いてから一度で出す。',
  },
  {
    id: 'cb-ga-wa-01',
    kind: 'hack',
    situations: ['gas', 'water'],
    households: [],
    combo: ['gas', 'water'],
    priority: 1,
    title: '【ガス停止＋断水】献立は「洗い物が出ないもの」から選ぶ',
    body: '調理はポリ袋、器はラップを敷いた皿、箸は割り箸。加熱の回数と洗う水を同時に減らせる組み合わせを最初に決めておく。',
  },

  /* =========================================================================
     乳幼児・子ども
     ====================================================================== */
  {
    id: 'ba-now-01',
    kind: 'now',
    situations: [],
    households: ['baby'],
    priority: 1,
    title: 'ミルクは液体ミルク＋使い捨て哺乳瓶が最も確実',
    body: '粉ミルクは安全な湯と洗浄が必要で、断水・停電下では条件がそろわない。液体ミルクは常温のまま飲ませられる。紙コップでの授乳も新生児から可能とされている。',
  },
  {
    id: 'ba-now-02',
    kind: 'now',
    situations: [],
    households: ['baby'],
    priority: 1,
    title: 'おむつとおしりふきの残数を数え、1日分×日数で計算する',
    body: 'おしりふきは体拭き・食器拭き・手拭きにも使える最重要の消耗品。足りないときはキッチンペーパーを水で湿らせて代用する。',
  },
  {
    id: 'ba-now-03',
    kind: 'now',
    situations: [],
    households: ['baby'],
    priority: 2,
    title: '名前・連絡先・血液型を書いたカードを衣服に入れる',
    body: 'はぐれたときの命綱になる。保護者の名前と、被災地外の親戚の連絡先も併記しておく。上着のポケットや靴の中に。',
  },
  {
    id: 'ba-hack-01',
    kind: 'hack',
    situations: [],
    households: ['baby'],
    priority: 2,
    title: '日課と遊びを止めない',
    body: '絵本・折り紙・シール・お絵かき帳。いつもと同じことが1つでも続くと、子どもは驚くほど落ち着く。寝る前の習慣は特に守る。',
  },
  {
    id: 'ba-hack-02',
    kind: 'hack',
    situations: ['blackout'],
    households: ['baby'],
    priority: 1,
    title: '暗さが怖い子には、小さなライトを自分で持たせる',
    body: '自分で光を操作できると恐怖が大きく減る。首から下げられるライトや、押すと光るおもちゃでもよい。',
  },
  {
    id: 'ba-hack-03',
    kind: 'hack',
    situations: [],
    households: ['baby'],
    priority: 3,
    title: '抱っこひもは避難用具。玄関の近くに置く',
    body: '瓦礫やガラスの上をベビーカーでは進めない。両手が空くことが、荷物と安全の両方を守る。',
  },
  {
    id: 'ba-caution-01',
    kind: 'caution',
    situations: [],
    households: ['baby'],
    priority: 1,
    title: '子どもの前で被災映像を流し続けない',
    body: '繰り返し見ることで強い不安が残ることがある。ニュースは大人が別の場所で確認し、子どもには「今どうすればいいか」だけを短く伝える。',
  },
  {
    id: 'ba-caution-02',
    kind: 'caution',
    situations: [],
    households: ['baby'],
    priority: 2,
    title: '体温調節が未熟。夏の熱中症・冬の低体温に大人より早く陥る',
    body: '手足ではなく背中やお腹に触れて体温を確かめる。汗をかいていたら着替えさせ、寒いときは1枚多く重ねる。',
  },

  /* =========================================================================
     高齢者
     ====================================================================== */
  {
    id: 'el-now-01',
    kind: 'now',
    situations: [],
    households: ['elderly'],
    priority: 1,
    title: '常用薬とお薬手帳を、今すぐ1か所にまとめる',
    body: '残りの日数を数え、1週間を切るなら早めに医療機関か薬局に相談する。お薬手帳はスマホで撮影しておけば、手帳を失っても処方が伝えられる。',
  },
  {
    id: 'el-now-02',
    kind: 'now',
    situations: [],
    households: ['elderly'],
    priority: 1,
    title: '水分をこまめに勧める。のどの渇きを感じにくくなっている',
    body: '脱水は血栓や体調の急変につながる。時間を決めて「一口飲む」を促す。トイレを気にして控えてしまうことが多いので、先にトイレの安心を用意する。',
  },
  {
    id: 'el-now-03',
    kind: 'now',
    situations: ['blackout'],
    households: ['elderly'],
    priority: 1,
    title: '足元灯を置き、動線から荷物をどける',
    body: '暗い室内での転倒・骨折は、そのまま寝たきりにつながる。寝室からトイレまでの経路に明かりを置き、床の障害物をすべて片付ける。',
  },
  {
    id: 'el-hack-01',
    kind: 'hack',
    situations: [],
    households: ['elderly'],
    priority: 2,
    title: '足首を回す・かかとを上げ下げする運動を1日数回',
    body: '同じ姿勢が続くと血栓ができやすくなる（エコノミークラス症候群）。座ったままできる運動を家族で一緒にやると続く。',
  },
  {
    id: 'el-hack-02',
    kind: 'hack',
    situations: ['food'],
    households: ['elderly'],
    priority: 2,
    title: 'かたい食べ物より、お粥・栄養補助飲料を優先する',
    body: '入れ歯が使えない、かむ力が落ちているなどで、配給の食事が食べられないことがある。レトルトのお粥と栄養補助飲料を確保しておく。',
  },
  {
    id: 'el-hack-03',
    kind: 'hack',
    situations: [],
    households: ['elderly'],
    priority: 3,
    title: '補聴器の電池、眼鏡、入れ歯の予備を確認する',
    body: '見える・聞こえる・食べられるが失われると、情報も栄養も届かなくなる。予備と洗浄用品を防災用品と同じ場所に置く。',
  },
  {
    id: 'el-caution-01',
    kind: 'caution',
    situations: [],
    households: ['elderly'],
    priority: 1,
    title: '1日2回は声をかけ、様子の変化を見る',
    body: '「いつもと違う」に本人が気づけないことがある。食事量・トイレの回数・受け答えの様子を見て、迷ったら医療機関や自治体の相談窓口に連絡する。',
  },

  /* =========================================================================
     ペット
     ====================================================================== */
  {
    id: 'pe-now-01',
    kind: 'now',
    situations: [],
    households: ['pet'],
    priority: 1,
    title: 'フードと水の残量を確認する。最低5〜7日分',
    body: '支援物資でペット用品が届くまでには時間がかかる。療法食は代替が効かないため、かかりつけの動物病院の連絡先も一緒に確認しておく。',
  },
  {
    id: 'pe-now-02',
    kind: 'now',
    situations: [],
    households: ['pet'],
    priority: 2,
    title: 'キャリー・ケージをすぐ出せる場所に移す',
    body: '同行避難の前提になるだけでなく、余震で怖がった動物を落ち着かせる居場所にもなる。中に普段使っている布を入れておく。',
  },
  {
    id: 'pe-now-03',
    kind: 'now',
    situations: [],
    households: ['pet'],
    priority: 2,
    title: '飼い主と一緒に写った写真をスマホに用意する',
    body: 'はぐれたときの捜索と、飼い主であることの証明に使う。迷子札とマイクロチップの登録内容も確認しておく。',
  },
  {
    id: 'pe-hack-01',
    kind: 'hack',
    situations: ['toilet'],
    households: ['pet'],
    priority: 1,
    title: 'ペットシーツと猫砂は、人の簡易トイレにも使える',
    body: '吸水力が高く、消臭剤入りのものが多い。ペット用として多めに備えておくと、家族全員の備えになる。',
  },
  {
    id: 'pe-hack-02',
    kind: 'hack',
    situations: [],
    households: ['pet'],
    priority: 2,
    title: '暗く静かな居場所をつくる',
    body: '余震や人の出入りが続くと強いストレスを受ける。ケージに布をかけて視界を遮るだけでも落ち着くことが多い。',
  },
  {
    id: 'pe-caution-01',
    kind: 'caution',
    situations: [],
    households: ['pet'],
    priority: 2,
    title: '食べない・隠れる・下痢が続くときは受診を検討する',
    body: 'ストレス性の体調不良は数日遅れて出る。開いている動物病院を自治体や獣医師会の情報で確認しておく。',
  },
  {
    id: 'pe-caution-02',
    kind: 'caution',
    situations: [],
    households: ['pet'],
    priority: 3,
    title: '避難所のペット受け入れ条件は場所ごとに違う',
    body: '同行避難（一緒に避難する）は可能でも、同室で過ごせるとは限らない。ケージに慣れさせておくことが、結果的に一緒にいられる条件になる。',
  },

  /* =========================================================================
     持病・医療機器
     ====================================================================== */
  {
    id: 'me-now-01',
    kind: 'now',
    situations: ['blackout'],
    households: ['medical'],
    priority: 1,
    title: '在宅酸素・人工呼吸器・吸引器の電源確保を最優先で行う',
    body: '内蔵バッテリーの残り時間を確認し、医療機器の業者と主治医の緊急連絡先にすぐ連絡する。自動車のシガーソケットから給電できる機種もある。手順書がある場合はそれに従う。',
  },
  {
    id: 'me-now-02',
    kind: 'now',
    situations: [],
    households: ['medical'],
    priority: 1,
    title: '常用薬の残り日数を数える。1週間を切ったら相談する',
    body: '災害時は処方箋なしでも一定期間分を受け取れる特例が取られることがある。お薬手帳（写真でも可）を持って、開いている薬局か避難所の医療班に相談する。',
  },
  {
    id: 'me-now-03',
    kind: 'now',
    situations: ['blackout'],
    households: ['medical'],
    priority: 1,
    title: '冷蔵が必要な薬は、保冷剤とクーラーボックスに移す',
    body: 'インスリンや一部の注射薬は温度管理が必要。凍らせてはいけない薬もあるため、保冷剤が直接触れないようタオルで包む。',
  },
  {
    id: 'me-hack-01',
    kind: 'hack',
    situations: [],
    households: ['medical'],
    priority: 2,
    title: '病名・薬・かかりつけ医を1枚の紙にまとめて持ち歩く',
    body: '意識がないときでも医療者に伝わる。このアプリの「緊急メモ」に入れておけば、通信がなくても画面で見せられる。',
  },
  {
    id: 'me-hack-02',
    kind: 'hack',
    situations: [],
    households: ['medical'],
    priority: 2,
    title: '透析・定期通院は、受け入れ先の情報を早めに取る',
    body: '通っている施設が被災していても、他の施設が受け入れることがある。自治体や都道府県の災害医療の窓口で確認する。',
  },
  {
    id: 'me-caution-01',
    kind: 'caution',
    situations: [],
    households: ['medical'],
    priority: 1,
    title: '自己判断で薬を減らしたり止めたりしない',
    body: '残りが少ないときほど「節約」したくなるが、中断で急激に悪化する薬がある。減らす前に必ず医療者に相談する。',
  },

  /* =========================================================================
     妊娠中
     ====================================================================== */
  {
    id: 'pr-now-01',
    kind: 'now',
    situations: [],
    households: ['pregnant'],
    priority: 1,
    title: '母子健康手帳と診察券を身につけておく',
    body: '受診先が変わっても、経過が分かれば適切な処置につながる。写真をスマホにも保存しておく。',
  },
  {
    id: 'pr-now-02',
    kind: 'now',
    situations: [],
    households: ['pregnant'],
    priority: 1,
    title: 'かかりつけ産科の状況と、受け入れ先を確認する',
    body: '被災で分娩を扱えなくなることがある。早い段階で連絡を取り、代替の受け入れ先を聞いておく。',
  },
  {
    id: 'pr-now-03',
    kind: 'now',
    situations: ['water'],
    households: ['pregnant'],
    priority: 1,
    title: '水分と休息を最優先にする。我慢が最も危険',
    body: '脱水と疲労は切迫早産の要因になる。トイレを気にして水を控えることのないよう、簡易トイレを先に整える。',
  },
  {
    id: 'pr-caution-01',
    kind: 'caution',
    situations: [],
    households: ['pregnant'],
    priority: 1,
    title: '破水・出血・強い張り・激しい腹痛は、遠慮せず救急へ',
    body: '「みんな大変だから」と我慢しない。119番は圏外表示でもつながることがある。近隣の人にも状況を伝えて助けを求める。',
  },
  {
    id: 'pr-caution-02',
    kind: 'caution',
    situations: [],
    households: ['pregnant'],
    priority: 2,
    title: '長時間同じ姿勢を避け、足を動かす',
    body: '妊娠中は血栓ができやすい。車中泊は特にリスクが高いため、こまめに姿勢を変え、水分を取る。',
  },
];

/**
 * 選択された状況・世帯条件に対して、表示すべき項目を優先度順に返す。
 *
 * 並び順のルール（上から順に適用）
 *   1. combo（複数の状況が重なったとき専用の項目）を最優先
 *   2. priority の小さい順
 *   3. 世帯条件つきの項目を、同じ priority の中では前に出す
 *      （その人にしか当てはまらない情報は埋もれやすいため）
 *
 * @param {string[]} situations 選択中の状況 id
 * @param {string[]} households 選択中の世帯条件 id
 * @returns {object[]} 表示対象の項目
 */
export function filterItems(situations, households) {
  const sit = new Set(situations);
  const hh = new Set(households);

  return ITEMS.filter((item) => {
    // combo は指定された状況が「すべて」選ばれているときだけ表示する
    if (item.combo) {
      return item.combo.every((id) => sit.has(id));
    }

    const needsSituation = item.situations.length > 0;
    const needsHousehold = item.households.length > 0;

    const situationOk = needsSituation && item.situations.some((id) => sit.has(id));
    const householdOk = needsHousehold && item.households.some((id) => hh.has(id));

    if (needsSituation && needsHousehold) return situationOk && householdOk;
    if (needsSituation) return situationOk;
    if (needsHousehold) return householdOk;
    return false;
  }).sort((a, b) => {
    const comboDiff = (b.combo ? 1 : 0) - (a.combo ? 1 : 0);
    if (comboDiff !== 0) return comboDiff;

    if (a.priority !== b.priority) return a.priority - b.priority;

    const hhDiff = (b.households.length ? 1 : 0) - (a.households.length ? 1 : 0);
    if (hhDiff !== 0) return hhDiff;

    return a.id.localeCompare(b.id);
  });
}

/**
 * ライフハック集ページ用。カテゴリ（状況 id もしくは世帯条件 id）で全件から抜き出す。
 * 絞り込みの状態に関係なく、そのカテゴリの内容をすべて返す。
 *
 * @param {string} categoryId 状況 id または世帯条件 id
 */
export function itemsByCategory(categoryId) {
  return ITEMS.filter(
    (item) => item.situations.includes(categoryId) || item.households.includes(categoryId)
  ).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });
}
