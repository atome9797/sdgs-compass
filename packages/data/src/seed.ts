// 데모용 샘플 데이터 (일본어·한국어). 기업·인물·수치는 모두 가상의 샘플이에요. 날짜는 "오늘" 기준 상대값이라 언제 열어도 D-day 가 자연스러워요.
// 실서비스에서는 이 모양의 데이터를 서버(PostgreSQL, db/schema.sql)가 돌려줘요.
import { emptyCertAnswers } from "@sdgs-compass/core/certification";
import type {
  Activity, Candidate, Challenge, Company, DemoState, Match, Proposal, Scout, SocialPost, StudentProfile, TeamPost,
} from "@sdgs-compass/core/domain";
import { splitMatchFee } from "@sdgs-compass/core/fees";
import { addDays } from "@sdgs-compass/core/format";
import { sha256Hex } from "@sdgs-compass/core/hash";
import { levelOf } from "@sdgs-compass/core/impact";
import { OFFICIAL_SHARE_FEE_YEN } from "@sdgs-compass/core/post";
import { DONATION_RECIPIENT } from "@sdgs-compass/core/state";

export const DEMO_STUDENT_ID = "stu-mina";
export const DEMO_COMPANY_ID = "co-minato";

const companies: Company[] = [
  {
    id: "co-minato",
    name: { ja: "みなと海洋フーズ株式会社", ko: "미나토 해양푸드(주)" },
    industry: { ja: "水産加工・食品", ko: "수산 가공·식품" },
    region: { ja: "神奈川県", ko: "가나가와현" },
    about: {
      ja: "漁港直送の魚を使った加工食品をつくる中小企業。包装の削減と、地域の海の保全に取り組んでいます。",
      ko: "어항 직송 생선으로 가공식품을 만드는 중소기업. 포장 감축과 지역 바다 보전에 힘쓰고 있어요.",
    },
    sdgIds: [14, 12],
    verified: true,
    emoji: "🐟",
    accent: "#0A97D9",
  },
  {
    id: "co-green",
    name: { ja: "グリーンリテール株式会社", ko: "그린리테일(주)" },
    industry: { ja: "小売・流通", ko: "소매·유통" },
    region: { ja: "東京都", ko: "도쿄도" },
    about: {
      ja: "首都圏でスーパーを展開。食品ロスの削減とレジ袋ゼロを進めています。",
      ko: "수도권에서 슈퍼마켓을 운영하며 식품 로스 감축과 비닐봉투 제로를 추진해요.",
    },
    sdgIds: [12, 13],
    verified: true,
    emoji: "🛒",
    accent: "#3F7E44",
  },
  {
    id: "co-hikari",
    name: { ja: "ひかりエナジー株式会社", ko: "히카리 에너지(주)" },
    industry: { ja: "エネルギー", ko: "에너지" },
    region: { ja: "千葉県", ko: "지바현" },
    about: {
      ja: "地域向けの太陽光発電と省エネ提案を行う企業。学生と一緒につくる啓発企画を探しています。",
      ko: "지역 대상 태양광 발전과 에너지 절약 제안을 하는 기업. 학생과 함께 만드는 계몽 기획을 찾고 있어요.",
    },
    sdgIds: [7, 13],
    verified: true,
    emoji: "☀️",
    accent: "#F5B700",
  },
  {
    id: "co-machi",
    name: { ja: "まちづくりラボ合同会社", ko: "마을만들기 랩(합동회사)" },
    industry: { ja: "地域活性・不動産", ko: "지역 활성화·부동산" },
    region: { ja: "神奈川県横浜市", ko: "가나가와현 요코하마시" },
    about: {
      ja: "商店街や空き店舗を活かした地域のにぎわいづくりを支援しています。",
      ko: "상점가와 빈 점포를 살려 지역의 활기를 만드는 일을 지원해요.",
    },
    sdgIds: [11, 17],
    verified: true,
    emoji: "🏘️",
    accent: "#FD9D24",
  },
  {
    id: "co-yasai",
    name: { ja: "やさい未来ファーム", ko: "야채 미래 팜" },
    industry: { ja: "農業", ko: "농업" },
    region: { ja: "埼玉県", ko: "사이타마현" },
    about: {
      ja: "規格外の野菜を無駄にしない販売方法を広げたい、農業法人です。",
      ko: "규격 외 채소를 버리지 않는 판매 방식을 넓히고 싶은 농업 법인이에요.",
    },
    sdgIds: [2, 15],
    verified: true,
    emoji: "🥬",
    accent: "#56C02B",
  },
  {
    id: "co-kotoba",
    name: { ja: "ことば教育サポート株式会社", ko: "코토바 교육 서포트(주)" },
    industry: { ja: "教育・語学", ko: "교육·어학" },
    region: { ja: "東京都", ko: "도쿄도" },
    about: {
      ja: "子ども向けの学習教材を制作。日本と韓国の子どもをつなぐ教材づくりに挑戦しています。",
      ko: "어린이용 학습 교재를 만드는 회사. 일본과 한국 아이들을 잇는 교재 제작에 도전하고 있어요.",
    },
    sdgIds: [4, 10, 17],
    verified: true,
    emoji: "📚",
    accent: "#C5192D",
  },
];

function buildChallenges(today: string): Challenge[] {
  const d = (n: number) => addDays(today, n);
  return [
    {
      id: "ch-plastic",
      companyId: "co-minato",
      title: { ja: "海洋プラスチックを減らす新しい包装アイデア", ko: "해양 플라스틱을 줄이는 새로운 포장 아이디어" },
      summary: {
        ja: "商品の包装を見直し、海に流れ出るプラスチックごみを減らす企画を募集します。",
        ko: "상품 포장을 재검토해 바다로 흘러가는 플라스틱 쓰레기를 줄이는 기획을 모집해요.",
      },
      background: {
        ja: "当社は年間約120万個の水産加工品を出荷しており、包装由来のプラスチックごみが課題です。漁港周辺の清掃活動でも、包装ごみが多く見つかっています。",
        ko: "저희는 연간 약 120만 개의 수산 가공품을 출하하며, 포장에서 나오는 플라스틱 쓰레기가 과제예요. 어항 주변 청소 활동에서도 포장 쓰레기가 많이 발견돼요.",
      },
      mission: {
        ja: "コストを大きく増やさずに、環境への負担を下げる「包装・回収・啓発」のアイデアを提案してください。",
        ko: "비용을 크게 늘리지 않으면서 환경 부담을 낮추는 '포장·회수·계몽' 아이디어를 제안해 주세요.",
      },
      deliverables: [
        { ja: "企画書（PDF・PPTX、10枚以内）", ko: "기획서(PDF·PPTX, 10장 이내)" },
        { ja: "想定コストと効果の試算", ko: "예상 비용과 효과 추정" },
        { ja: "（任意）イメージ動画のURL", ko: "(선택) 이미지 영상 URL" },
      ],
      sdgIds: [14, 12],
      skills: ["design", "research", "planning"],
      prizeYen: 100_000,
      rewards: ["prize", "internship"],
      participation: "both",
      impactPoints: 120,
      opensOn: d(-8),
      closesOn: d(12),
      status: "open",
      applicants: 3,
      hue: 200,
    },
    {
      id: "ch-foodloss",
      companyId: "co-green",
      title: { ja: "フードロスを減らす売り場づくり提案", ko: "푸드 로스를 줄이는 매장 구성 제안" },
      summary: {
        ja: "賞味期限が近い商品を「もったいない」から「選びたい」に変える売り場の工夫を募集します。",
        ko: "유통기한이 임박한 상품을 '아깝다'에서 '고르고 싶다'로 바꾸는 매장 아이디어를 모집해요.",
      },
      background: {
        ja: "スーパーでは、売れ残りによる食品ロスが毎日発生しています。値引きだけに頼らない方法を探しています。",
        ko: "슈퍼마켓에서는 팔리지 않은 식품 로스가 매일 발생해요. 할인에만 의존하지 않는 방법을 찾고 있어요.",
      },
      mission: {
        ja: "店頭の見せ方・価格・情報発信のいずれかで、ロスを2割減らす提案をしてください。",
        ko: "매장 진열·가격·정보 발신 중 하나로 로스를 20% 줄이는 제안을 해 주세요.",
      },
      deliverables: [
        { ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" },
        { ja: "売り場のイメージ図", ko: "매장 이미지 도안" },
      ],
      sdgIds: [12, 2],
      skills: ["marketing", "data"],
      prizeYen: 50_000,
      rewards: ["prize"],
      participation: "both",
      impactPoints: 100,
      opensOn: d(-10),
      closesOn: d(5),
      status: "open",
      applicants: 64,
      hue: 130,
    },
    {
      id: "ch-solar",
      companyId: "co-hikari",
      title: { ja: "学生寮・大学向け 再エネ導入ストーリー企画", ko: "학생 기숙사·대학 대상 재생에너지 도입 스토리 기획" },
      summary: {
        ja: "再生可能エネルギーを身近に感じてもらうための、動画やイベントの企画を募集します。",
        ko: "재생에너지를 가깝게 느끼도록 하는 영상·이벤트 기획을 모집해요.",
      },
      background: {
        ja: "再エネに関心はあっても、自分ごととして考えにくいという声が若い世代に多くあります。",
        ko: "재생에너지에 관심은 있어도 '나의 일'로 느끼기 어렵다는 목소리가 젊은 세대에 많아요.",
      },
      mission: {
        ja: "学生寮や大学で実施できる、再エネ導入のきっかけづくりを提案してください。",
        ko: "학생 기숙사나 대학에서 실행할 수 있는 재생에너지 도입의 계기 만들기를 제안해 주세요.",
      },
      deliverables: [
        { ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" },
        { ja: "（任意）60秒の紹介動画URL", ko: "(선택) 60초 소개 영상 URL" },
      ],
      sdgIds: [7, 13],
      skills: ["planning", "video", "writing"],
      prizeYen: 150_000,
      rewards: ["prize"],
      participation: "both",
      impactPoints: 140,
      opensOn: d(-5),
      closesOn: d(21),
      status: "open",
      applicants: 31,
      hue: 45,
    },
    {
      id: "ch-shotengai",
      companyId: "co-machi",
      title: { ja: "商店街の空き店舗を活かすSNS企画", ko: "상점가의 빈 점포를 살리는 SNS 기획" },
      summary: {
        ja: "空き店舗を「人が集まる場所」に変える、SNS発信とイベントのアイデアを募集します。",
        ko: "빈 점포를 '사람이 모이는 곳'으로 바꾸는 SNS 발신과 이벤트 아이디어를 모집해요.",
      },
      background: {
        ja: "商店街の空き店舗が増え、にぎわいが減っています。若い世代の発信力に期待しています。",
        ko: "상점가의 빈 점포가 늘고 활기가 줄었어요. 젊은 세대의 발신력에 기대하고 있어요.",
      },
      mission: {
        ja: "1か月で実行できる、空き店舗の活用とSNS集客の企画を提案してください。",
        ko: "한 달 안에 실행할 수 있는 빈 점포 활용과 SNS 집객 기획을 제안해 주세요.",
      },
      deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }, { ja: "SNS投稿のサンプル", ko: "SNS 게시물 샘플" }],
      sdgIds: [11, 8],
      skills: ["marketing", "video"],
      prizeYen: 80_000,
      rewards: ["prize", "internship"],
      participation: "both",
      impactPoints: 110,
      opensOn: d(-3),
      closesOn: d(18),
      status: "open",
      applicants: 42,
      hue: 25,
    },
    {
      id: "ch-vegetable",
      companyId: "co-yasai",
      title: { ja: "規格外野菜の新しい食べ方・売り方", ko: "규격 외 채소의 새로운 먹는 법·파는 법" },
      summary: {
        ja: "形や大きさが規格外でも、おいしい野菜の魅力を伝える商品やレシピを募集します。",
        ko: "모양과 크기가 규격 외여도 맛있는 채소의 매력을 전하는 상품·레시피를 모집해요.",
      },
      background: {
        ja: "収穫量の約1割が、見た目の理由で出荷できずに残っています。",
        ko: "수확량의 약 10%가 외관 때문에 출하하지 못하고 남아요.",
      },
      mission: {
        ja: "規格外野菜を活かす商品名・パッケージ・売り方のいずれかを提案してください。",
        ko: "규격 외 채소를 살리는 상품명·패키지·판매 방식 중 하나를 제안해 주세요.",
      },
      deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }],
      sdgIds: [2, 12, 15],
      skills: ["design", "marketing"],
      prizeYen: 60_000,
      rewards: ["prize"],
      participation: "individual",
      impactPoints: 100,
      opensOn: d(-2),
      closesOn: d(27),
      status: "open",
      applicants: 25,
      hue: 95,
    },
    {
      id: "ch-kotoba",
      companyId: "co-kotoba",
      title: { ja: "日韓の子どもをつなぐ多言語学習コンテンツ", ko: "한일 어린이를 잇는 다국어 학습 콘텐츠" },
      summary: {
        ja: "日本と韓国の子どもが一緒に楽しめる、言葉と文化の学習コンテンツを募集します。",
        ko: "일본과 한국의 아이들이 함께 즐길 수 있는 언어·문화 학습 콘텐츠를 모집해요.",
      },
      background: {
        ja: "隣の国の言葉や文化に触れる機会が少なく、相互理解のきっかけが求められています。",
        ko: "이웃 나라의 언어와 문화를 접할 기회가 적어 상호 이해의 계기가 필요해요.",
      },
      mission: {
        ja: "アプリ・動画・ゲームなど、形式は自由。子どもが自分から使いたくなる学習体験を提案してください。",
        ko: "앱·영상·게임 등 형식은 자유. 아이가 스스로 쓰고 싶어지는 학습 경험을 제안해 주세요.",
      },
      deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }, { ja: "（任意）試作のURL", ko: "(선택) 시제품 URL" }],
      sdgIds: [4, 10, 17],
      skills: ["languages", "programming", "design"],
      prizeYen: 100_000,
      rewards: ["prize", "offer"],
      participation: "team",
      impactPoints: 130,
      opensOn: d(-1),
      closesOn: d(33),
      status: "open",
      applicants: 18,
      hue: 345,
    },
    {
      id: "ch-asaichi",
      companyId: "co-minato",
      title: { ja: "漁港の朝市をデジタルで広げる企画", ko: "어항 아침시장을 디지털로 알리는 기획" },
      summary: {
        ja: "漁港の朝市の魅力を、SNSやアプリで若い世代に届けるアイデアを募集します。",
        ko: "어항 아침시장의 매력을 SNS와 앱으로 젊은 세대에게 전하는 아이디어를 모집해요.",
      },
      background: {
        ja: "朝市の来場者は高齢層が中心で、若い世代にほとんど知られていません。",
        ko: "아침시장 방문객은 고령층이 중심이고 젊은 세대에게는 거의 알려지지 않았어요.",
      },
      mission: {
        ja: "来場のきっかけになる情報発信や予約・口コミの仕組みを提案してください。",
        ko: "방문의 계기가 되는 정보 발신이나 예약·입소문 구조를 제안해 주세요.",
      },
      deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }],
      sdgIds: [14, 8],
      skills: ["marketing", "programming"],
      prizeYen: 70_000,
      rewards: ["prize"],
      participation: "both",
      impactPoints: 100,
      opensOn: d(0),
      closesOn: d(9),
      status: "open",
      applicants: 0,
      hue: 190,
    },
    {
      id: "ch-bottle",
      companyId: "co-minato",
      title: { ja: "マイボトル持参を広げるキャンペーン企画", ko: "텀블러 지참을 확산하는 캠페인 기획" },
      summary: {
        ja: "ペットボトルごみを減らすため、マイボトルを持ち歩く習慣を広げる企画（審査中）。",
        ko: "페트병 쓰레기를 줄이기 위해 텀블러를 들고 다니는 습관을 넓히는 기획(심사 중).",
      },
      background: {
        ja: "漁港のイベントで出るペットボトルごみを減らしたいと考えています。",
        ko: "어항 이벤트에서 나오는 페트병 쓰레기를 줄이고 싶어요.",
      },
      mission: {
        ja: "来場者がマイボトルを持参したくなる仕掛けを提案してください。",
        ko: "방문객이 텀블러를 가져오고 싶어지는 장치를 제안해 주세요.",
      },
      deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }],
      sdgIds: [12, 14],
      skills: ["marketing", "design"],
      prizeYen: 50_000,
      rewards: ["prize"],
      participation: "both",
      impactPoints: 100,
      opensOn: d(-35),
      closesOn: d(-2),
      status: "judging",
      applicants: 5,
      hue: 210,
    },
    {
      id: "ch-old1",
      companyId: "co-minato",
      title: { ja: "漁港清掃の参加者を増やすポスター企画", ko: "어항 청소 참가자를 늘리는 포스터 기획" },
      summary: { ja: "終了したチャレンジです。", ko: "종료된 챌린지예요." },
      background: { ja: "終了したチャレンジです。", ko: "종료된 챌린지예요." },
      mission: { ja: "終了したチャレンジです。", ko: "종료된 챌린지예요." },
      deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }],
      sdgIds: [14, 11],
      skills: ["design"],
      prizeYen: 30_000,
      rewards: ["prize"],
      participation: "both",
      impactPoints: 100,
      opensOn: d(-90),
      closesOn: d(-60),
      status: "closed",
      applicants: 12,
      hue: 200,
    },
    {
      id: "ch-old2",
      companyId: "co-minato",
      title: { ja: "地元の海産物レシピ動画コンテスト", ko: "지역 해산물 레시피 영상 콘테스트" },
      summary: { ja: "終了したチャレンジです。", ko: "종료된 챌린지예요." },
      background: { ja: "終了したチャレンジです。", ko: "종료된 챌린지예요." },
      mission: { ja: "終了したチャレンジです。", ko: "종료된 챌린지예요." },
      deliverables: [{ ja: "企画書（PDF・PPTX）", ko: "기획서(PDF·PPTX)" }],
      sdgIds: [14, 12],
      skills: ["video"],
      prizeYen: 30_000,
      rewards: ["prize"],
      participation: "both",
      impactPoints: 100,
      opensOn: d(-120),
      closesOn: d(-90),
      status: "closed",
      applicants: 20,
      hue: 180,
    },
  ];
}

function buildTeamPosts(today: string): TeamPost[] {
  const d = (n: number) => addDays(today, n);
  const base = { mine: false, requestedByMe: false } as const;
  return [
    {
      ...base, id: "tp-1", challengeId: "ch-plastic", authorName: "Haru", authorLevel: 2,
      title: { ja: "経営学専攻のチームメンバー探してます", ko: "경영학 전공 팀원을 찾고 있어요" },
      body: { ja: "包装のコスト試算を一緒にやってくれる方を募集しています。", ko: "포장 비용 추정을 함께 해 줄 분을 모집해요." },
      rolesWanted: ["finance", "research"], sdgIds: [14, 12], createdOn: d(-2), requests: 3,
    },
    {
      ...base, id: "tp-2", challengeId: "ch-plastic", authorName: "Yuna", authorLevel: 3,
      title: { ja: "デザインが得意な方、パッケージ案を一緒に作りませんか", ko: "디자인에 자신 있는 분, 패키지안을 함께 만들어요" },
      body: { ja: "紙素材のパッケージ案を考えています。デザイン担当を探しています。", ko: "종이 소재 패키지안을 구상 중이에요. 디자인 담당을 찾고 있어요." },
      rolesWanted: ["design"], sdgIds: [14, 12], createdOn: d(-1), requests: 5,
    },
    {
      ...base, id: "tp-3", challengeId: "ch-foodloss", authorName: "Sota", authorLevel: 2,
      title: { ja: "データ分析ができる仲間を募集", ko: "데이터 분석이 가능한 동료 모집" },
      body: { ja: "売れ残りのデータから、値引きのタイミングを分析したいです。", ko: "팔리지 않은 데이터로 할인 타이밍을 분석하고 싶어요." },
      rolesWanted: ["data"], sdgIds: [12, 2], createdOn: d(-3), requests: 1,
    },
    {
      ...base, id: "tp-4", challengeId: "ch-solar", authorName: "Jiwoo", authorLevel: 3,
      title: { ja: "動画編集できる人いませんか？", ko: "영상 편집 가능한 분 계신가요?" },
      body: { ja: "寮生活を題材に、再エネの紹介動画を作りたいです。", ko: "기숙사 생활을 소재로 재생에너지 소개 영상을 만들고 싶어요." },
      rolesWanted: ["video"], sdgIds: [7, 13], createdOn: d(-1), requests: 2,
    },
    {
      ...base, id: "tp-5", challengeId: "ch-shotengai", authorName: "Ren", authorLevel: 1,
      title: { ja: "SNS運用の経験者を探しています", ko: "SNS 운영 경험자를 찾고 있어요" },
      body: { ja: "商店街の公式アカウントを一緒に育てましょう。", ko: "상점가 공식 계정을 함께 키워 가요." },
      rolesWanted: ["marketing"], sdgIds: [11, 8], createdOn: d(0), requests: 0,
    },
    {
      ...base, id: "tp-6", challengeId: "ch-kotoba", authorName: "Soyeon", authorLevel: 4,
      title: { ja: "韓国語ネイティブの方、教材の監修をお願いしたいです", ko: "한국어 원어민 분, 교재 감수를 부탁드리고 싶어요" },
      body: { ja: "日韓のことばあそび教材を作ります。自然な表現のチェックをお願いします。", ko: "한일 말놀이 교재를 만들어요. 자연스러운 표현 확인을 부탁드려요." },
      rolesWanted: ["languages", "writing"], sdgIds: [4, 17], createdOn: d(-1), requests: 4,
    },
    {
      ...base, id: "tp-7", challengeId: "ch-kotoba", authorName: "Mei", authorLevel: 2,
      title: { ja: "アプリ開発ができる方、一緒に試作を作りましょう", ko: "앱 개발이 가능한 분, 함께 시제품을 만들어요" },
      body: { ja: "簡単なクイズアプリの試作を週末に作る予定です。", ko: "주말에 간단한 퀴즈 앱 시제품을 만들 예정이에요." },
      rolesWanted: ["programming"], sdgIds: [4, 10], createdOn: d(-2), requests: 2,
    },
  ];
}

const me: StudentProfile = {
  id: DEMO_STUDENT_ID,
  nickname: "Mina",
  university: { ja: "サンプル大学", ko: "샘플대학교" },
  faculty: { ja: "経営学部", ko: "경영학부" },
  gradYear: 2028,
  skills: ["marketing", "languages", "planning"],
  sdgInterests: [14, 12, 13, 4, 17],
  scoutable: true,
  bio: {
    ja: "日韓をつなぐSDGs企画に挑戦中。海と食の課題に関心があります。",
    ko: "한일을 잇는 SDGs 기획에 도전 중. 바다와 식량 문제에 관심이 있어요.",
  },
};

function buildHistory(today: string): Activity[] {
  const d = (n: number) => addDays(today, n);
  const machi = { ja: "まちづくりラボ合同会社", ko: "마을만들기 랩(합동회사)" };
  const green = { ja: "グリーンリテール株式会社", ko: "그린리테일(주)" };
  const hikari = { ja: "ひかりエナジー株式会社", ko: "히카리 에너지(주)" };
  const minato = { ja: "みなと海洋フーズ株式会社", ko: "미나토 해양푸드(주)" };
  const sns = { ja: "SDGs啓発協議会（サンプル）", ko: "SDGs 계몽 협의회(샘플)" };
  return [
    { id: "h-1", kind: "participation", title: { ja: "地域の海岸清掃キャンペーン企画", ko: "지역 해안 청소 캠페인 기획" }, companyName: machi, sdgIds: [14, 11], date: d(-95), points: 50 },
    { id: "h-2", kind: "submission", title: { ja: "フードロス削減アプリ案", ko: "푸드 로스 감축 앱 제안" }, companyName: green, sdgIds: [2], date: d(-80), points: 179, scores: { creativity: 4, feasibility: 3, sdgContribution: 4 } },
    { id: "h-3", kind: "submission", title: { ja: "再エネ啓発動画コンテスト", ko: "재생에너지 계몽 영상 콘테스트" }, companyName: hikari, sdgIds: [7, 13], date: d(-70), points: 215, scores: { creativity: 5, feasibility: 4, sdgContribution: 5 } },
    { id: "h-4a", kind: "submission", title: { ja: "多言語防災マップ案", ko: "다국어 방재 지도 제안" }, companyName: machi, sdgIds: [11, 10], date: d(-55), points: 174, scores: { creativity: 4, feasibility: 4, sdgContribution: 4 } },
    { id: "h-4b", kind: "award", title: { ja: "多言語防災マップ案", ko: "다국어 방재 지도 제안" }, companyName: machi, sdgIds: [11, 10], date: d(-45), points: 200, award: "special" },
    { id: "h-5", kind: "submission", title: { ja: "プラスチックごみ削減ハッカソン", ko: "플라스틱 쓰레기 감축 해커톤" }, companyName: minato, sdgIds: [14, 12], date: d(-40), points: 179, scores: { creativity: 4, feasibility: 4, sdgContribution: 3 } },
    { id: "h-5b", kind: "award", title: { ja: "プラスチックごみ削減ハッカソン", ko: "플라스틱 쓰레기 감축 해커톤" }, companyName: minato, sdgIds: [14, 12], date: d(-28), points: 300, award: "excellence" },
    { id: "h-6", kind: "submission", title: { ja: "SDGs啓発SNSキャンペーン", ko: "SDGs 계몽 SNS 캠페인" }, companyName: sns, sdgIds: [4, 17], date: d(-30), points: 169, scores: { creativity: 5, feasibility: 4, sdgContribution: 4 } },
  ];
}

const talent: Candidate[] = [
  { id: "cand-haru", nickname: "Haru", university: { ja: "サンプル大学", ko: "샘플대학교" }, faculty: { ja: "経済学部", ko: "경제학부" }, skills: ["finance", "research", "data"], sdgInterests: [12, 8, 1], points: 820, awards: 1, scoutable: true, bio: { ja: "コスト試算とリサーチが得意です。", ko: "비용 추정과 리서치가 특기예요." } },
  { id: "cand-yuna", nickname: "Yuna", university: { ja: "サンプル大学", ko: "샘플대학교" }, faculty: { ja: "デザイン学部", ko: "디자인학부" }, skills: ["design", "video"], sdgInterests: [14, 12, 11], points: 1260, awards: 2, scoutable: true, bio: { ja: "海の環境をテーマに、パッケージと映像を制作しています。", ko: "바다 환경을 주제로 패키지와 영상을 제작해요." } },
  { id: "cand-sota", nickname: "Sota", university: { ja: "サンプル大学", ko: "샘플대학교" }, faculty: { ja: "情報学部", ko: "정보학부" }, skills: ["programming", "data"], sdgInterests: [9, 7, 13], points: 640, awards: 0, scoutable: true, bio: { ja: "データ分析とアプリ開発ができます。", ko: "데이터 분석과 앱 개발이 가능해요." } },
  { id: "cand-jiwoo", nickname: "Jiwoo", university: { ja: "サンプル大学（交換留学生）", ko: "샘플대학교(교환학생)" }, faculty: { ja: "国際学部", ko: "국제학부" }, skills: ["languages", "writing", "marketing"], sdgInterests: [4, 10, 17], points: 1720, awards: 3, scoutable: true, bio: { ja: "日韓の架け橋になる企画が得意です。", ko: "한일 가교가 되는 기획이 특기예요." } },
  { id: "cand-ren", nickname: "Ren", university: { ja: "サンプル大学", ko: "샘플대학교" }, faculty: { ja: "社会学部", ko: "사회학부" }, skills: ["marketing", "planning"], sdgInterests: [11, 8], points: 380, awards: 0, scoutable: true, bio: { ja: "地域イベントの運営経験があります。", ko: "지역 이벤트 운영 경험이 있어요." } },
  { id: "cand-mei", nickname: "Mei", university: { ja: "サンプル大学", ko: "샘플대학교" }, faculty: { ja: "農学部", ko: "농학부" }, skills: ["research", "writing"], sdgInterests: [2, 15, 12], points: 910, awards: 1, scoutable: false, bio: { ja: "農業と食の研究をしています。", ko: "농업과 식품을 연구하고 있어요." } },
  { id: "cand-daichi", nickname: "Daichi", university: { ja: "サンプル大学", ko: "샘플대학교" }, faculty: { ja: "工学部", ko: "공학부" }, skills: ["programming", "planning"], sdgInterests: [7, 9], points: 2150, awards: 4, scoutable: true, bio: { ja: "再エネ分野のアプリ開発の受賞歴があります。", ko: "재생에너지 분야 앱 개발 수상 경력이 있어요." } },
  { id: "cand-soyeon", nickname: "Soyeon", university: { ja: "サンプル大学", ko: "샘플대학교" }, faculty: { ja: "教育学部", ko: "교육학부" }, skills: ["languages", "writing"], sdgInterests: [4, 3, 5], points: 530, awards: 0, scoutable: true, bio: { ja: "子ども向け教材の制作に関心があります。", ko: "어린이용 교재 제작에 관심이 있어요." } },
];

function proposal(
  id: string, challengeId: string, teamName: string, title: string, summary: string, fileName: string, sizeBytes: number,
  at: string, status: Proposal["status"], review: Proposal["review"], seq: number,
): Proposal {
  return {
    id, challengeId, mine: false, teamName, title, summary, videoUrl: "",
    versions: [{ no: 1, fileName, fileSizeBytes: sizeBytes, submittedAt: at, sha256: sha256Hex(`${fileName}|${sizeBytes}|${title}|${summary}|v1`) }],
    receiptNo: `SC-${at.slice(0, 10).replaceAll("-", "")}-${String(seq).padStart(4, "0")}`,
    submittedAt: at, status, review, award: null,
  };
}

function buildProposals(today: string): Proposal[] {
  const at = (n: number, time: string) => `${addDays(today, n)}T${time}`;
  const reviewed = (c: number, f: number, s: number, comment: string, n: number) => ({ creativity: c, feasibility: f, sdgContribution: s, comment, reviewedAt: at(n, "16:00") });
  return [
    proposal("pp-1", "ch-plastic", "クリーンシーサイド", "紙と海藻由来フィルムの二層包装", "プラスチックを使わない二層構造の包装を提案します。想定コストは現在の1.15倍です。", "clean_seaside.pdf", 3_200_000, at(-3, "20:12"), "submitted", null, 1),
    proposal("pp-2", "ch-plastic", "ブルーループ", "漁港に空き容器の回収ボックスを設置", "漁港を訪れる人が空き容器をその場で返せる回収ボックスと、ポイント制度を提案します。", "blue_loop.pptx", 5_800_000, at(-2, "09:40"), "submitted", null, 2),
    proposal("pp-3", "ch-plastic", "もったいない研究会", "詰め替え式パッケージ＋QRで産地ストーリー", "詰め替えで包装を減らし、QRコードで漁師さんの紹介ページに案内します。", "mottainai_refill.pdf", 2_100_000, at(-1, "22:05"), "submitted", null, 3),
    proposal("pb-1", "ch-bottle", "ボトルフレンズ", "キャンパス給水スポットマップ", "給水機の場所を地図にして、マイボトルを持ち歩く動機をつくります。", "bottle_friends.pdf", 2_400_000, at(-12, "18:20"), "reviewed", reviewed(4, 4, 5, "実行しやすく、効果も測りやすいです。", -1), 4),
    proposal("pb-2", "ch-bottle", "SEA-Cycle", "漁港マイボトルのデポジット制度", "マイボトルを持参した人に、デポジットの代わりに市場のクーポンを渡す仕組みを提案します。", "sea_cycle.pptx", 4_900_000, at(-10, "11:30"), "reviewed", reviewed(5, 3, 4, "アイデアが新鮮。運用コストの試算がほしいです。", -1), 5),
    proposal("pb-3", "ch-bottle", "エコダッシュ", "朝の通学路ボトル補充ステーション", "通学路に補充ステーションを置く企画です。", "eco_dash.pdf", 1_800_000, at(-9, "07:55"), "submitted", null, 6),
    proposal("pb-4", "ch-bottle", "でこぼこ", "マイボトルでスタンプラリー", "漁港のお店を回るスタンプラリーで、マイボトル持参を促します。", "dekoboko.pptx", 3_600_000, at(-6, "21:10"), "submitted", null, 7),
    proposal("pb-5", "ch-bottle", "Blue Link", "日韓の学生がつくる、マイボトル啓発ショート動画", "日本と韓国の学生が一緒に作ったショート動画で、マイボトルの習慣を広めます。", "blue_link.pdf", 6_300_000, at(-4, "14:25"), "submitted", null, 8),
  ];
}

function buildMatches(today: string): Match[] {
  const split = splitMatchFee();
  return [
    { id: "m-1", challengeId: "ch-old1", proposalId: "pp-old-1", companyId: "co-minato", feeYen: split.feeYen, donationYen: split.donationYen, matchedOn: addDays(today, -58), recipient: DONATION_RECIPIENT },
    { id: "m-2", challengeId: "ch-old2", proposalId: "pp-old-2", companyId: "co-minato", feeYen: split.feeYen, donationYen: split.donationYen, matchedOn: addDays(today, -88), recipient: DONATION_RECIPIENT },
  ];
}

function buildScouts(today: string): Scout[] {
  return [
    {
      id: "sc-1",
      companyId: "co-hikari",
      studentId: DEMO_STUDENT_ID,
      kind: "interview",
      message: {
        ja: "再エネ啓発動画のご応募作品を拝見しました。インターンの面談にご興味はありませんか？",
        ko: "재생에너지 계몽 영상 응모작을 보았어요. 인턴십 면담에 관심이 있으신가요?",
      },
      sentAt: `${addDays(today, -1)}T10:30`,
      status: "sent",
    },
    {
      id: "sc-2",
      companyId: "co-green",
      studentId: DEMO_STUDENT_ID,
      kind: "internship",
      message: {
        ja: "食品ロス削減のレポートを読みました。冬のインターン（店舗の見学つき）にぜひ参加してください。",
        ko: "식품 로스 감축 리포트를 읽었어요. 겨울 인턴십(매장 견학 포함)에 꼭 참여해 주세요.",
      },
      sentAt: `${addDays(today, -4)}T15:10`,
      status: "read",
    },
    {
      id: "sc-3",
      companyId: "co-machi",
      studentId: DEMO_STUDENT_ID,
      kind: "offer",
      message: {
        ja: "商店街の企画で見せてくれた発想に注目しています。次の企画の仲間として、ぜひお話ししませんか？",
        ko: "상점가 기획에서 보여 준 발상에 주목했어요. 다음 기획의 동료로서 이야기를 나눠 보지 않으실래요?",
      },
      sentAt: `${addDays(today, -9)}T09:45`,
      status: "accepted",
    },
  ];
}

/** SNS 피드의 샘플 글 8개 (기업 홍보 4 + 학생 자랑 4, 모두 가상). 설계: docs/sns-feed.md */
function buildPosts(today: string): SocialPost[] {
  const d = (n: number) => addDays(today, n);
  const at = (n: number, time: string) => `${d(n)}T${time}`;
  const scheduled = (n: number) => ({ on: d(n), feeYen: OFFICIAL_SHARE_FEE_YEN, status: "scheduled" as const });
  const levelOfStudent = (id: string) => levelOf(talent.find((c) => c.id === id)?.points ?? 0);
  const minato = { ja: "みなと海洋フーズ株式会社", ko: "미나토 해양푸드(주)" };
  const hikari = { ja: "ひかりエナジー株式会社", ko: "히카리 에너지(주)" };
  const yasai = { ja: "やさい未来ファーム", ko: "야채 미래 팜" };
  const kotoba = { ja: "ことば教育サポート株式会社", ko: "코토바 교육 서포트(주)" };
  return [
    // 기업 홍보 글. 다른 기업이 내일(po-1)·모레(po-2)의 공식 SNS 게시 날짜를 이미 받아서, 우리 회사가 신청하면 3일 뒤가 배정돼요.
    {
      id: "po-1", kind: "pr", companyId: "co-green", challengeId: "ch-foodloss", sdgIds: [12, 2],
      title: { ja: "売り場のフードロス、学生の発想で減らしませんか", ko: "매장의 푸드 로스, 학생의 발상으로 줄여 볼까요" },
      body: {
        ja: "賞味期限が近い商品をどう見せれば、手に取ってもらえるか。店舗での実験データを公開して、学生のみなさんの提案を待っています。",
        ko: "유통기한이 가까운 상품을 어떻게 보여 주면 손이 갈까요? 매장 실험 데이터를 공개하고 학생 여러분의 제안을 기다리고 있어요.",
      },
      official: scheduled(1), createdAt: at(-1, "09:30"), likes: 18, likedBy: [], mine: false,
    },
    {
      id: "po-2", kind: "pr", companyId: "co-hikari", challengeId: "ch-solar", sdgIds: [7, 13],
      title: { ja: "寮の屋根を、学生と一緒に発電所に", ko: "기숙사 지붕을 학생과 함께 발전소로" },
      body: {
        ja: "再エネ導入のストーリーを、入居する学生の目線で企画してください。採用された企画は、実際の説明会で使います。",
        ko: "재생에너지 도입 이야기를 입주 학생의 시선으로 기획해 주세요. 채택된 기획은 실제 설명회에서 사용해요.",
      },
      official: scheduled(2), createdAt: at(-2, "15:00"), likes: 24, likedBy: [], mine: false,
    },
    {
      id: "po-3", kind: "pr", companyId: "co-machi", challengeId: "ch-shotengai", sdgIds: [11, 8],
      title: { ja: "空き店舗を、商店街の新しい顔に", ko: "빈 점포를 상점가의 새 얼굴로" },
      body: {
        ja: "シャッターが閉まったままの店舗を、SNSで人が集まる場所に変えたい。若い世代のアイデアを募集中です。",
        ko: "셔터가 내려간 점포를 SNS로 사람이 모이는 곳으로 바꾸고 싶어요. 젊은 세대의 아이디어를 모집 중이에요.",
      },
      official: null, createdAt: at(-3, "11:10"), likes: 9, likedBy: [], mine: false,
    },
    {
      id: "po-4", kind: "pr", companyId: "co-minato", challengeId: "ch-bottle", sdgIds: [14, 12],
      title: { ja: "マイボトル企画、たくさんのご応募ありがとうございます", ko: "텀블러 기획, 많은 응모 감사합니다" },
      body: {
        ja: "5チームから個性的な提案が届きました。審査結果は近日お知らせします。海を守る仲間が増えるのが楽しみです。",
        ko: "5개 팀에서 개성 있는 제안이 도착했어요. 심사 결과는 곧 알려 드릴게요. 바다를 지키는 동료가 늘어나는 것이 기대돼요.",
      },
      official: null, createdAt: at(-1, "18:20"), likes: 12, likedBy: [], mine: true,
    },
    // 학생 자랑 글 (닉네임·레벨만 보이고, 실적 1건이 붙어요). 내가 쓴 글은 처음에는 없어요.
    {
      id: "po-5", kind: "brag", authorName: "Yuna", authorLevel: levelOfStudent("cand-yuna"), sdgIds: [14, 11],
      achievement: {
        activityId: null, kind: "award", award: "excellence", companyName: minato, sdgIds: [14, 11],
        title: { ja: "漁港清掃の参加者を増やすポスター企画", ko: "어항 청소 참가자를 늘리는 포스터 기획" },
      },
      body: {
        ja: "ポスターの色を海の青に絞ったら、参加申込が増えたそうです。うれしくて報告します！ 次はデザインで漁港の朝市に挑戦します。",
        ko: "포스터 색을 바다의 파랑으로 좁혔더니 참가 신청이 늘었대요. 기뻐서 알려요! 다음은 디자인으로 어항 아침시장에 도전해요.",
      },
      createdAt: at(-1, "21:05"), likes: 31, likedBy: [], mine: false,
    },
    {
      id: "po-6", kind: "brag", authorName: "Daichi", authorLevel: levelOfStudent("cand-daichi"), sdgIds: [7, 13],
      achievement: {
        activityId: null, kind: "award", award: "grand", companyName: hikari, sdgIds: [7, 13],
        title: { ja: "再エネ啓発動画コンテスト", ko: "재생에너지 계몽 영상 콘테스트" },
      },
      body: {
        ja: "最優秀賞をいただきました。寮の電気の話を、実測データと一緒に動画にしたのが評価されたようです。応援ありがとうございました！",
        ko: "최우수상을 받았어요. 기숙사 전기 이야기를 실측 데이터와 함께 영상으로 만든 점이 평가받은 것 같아요. 응원해 주셔서 감사합니다!",
      },
      createdAt: at(-2, "20:40"), likes: 42, likedBy: [], mine: false,
    },
    {
      id: "po-7", kind: "brag", authorName: "Mei", authorLevel: levelOfStudent("cand-mei"), sdgIds: [2, 12],
      achievement: {
        activityId: null, kind: "submission", award: null, companyName: yasai, sdgIds: [2, 12],
        title: { ja: "規格外野菜の新しい食べ方・売り方", ko: "규격 외 채소의 새로운 먹는 법·파는 법" },
      },
      body: {
        ja: "規格外のトマトを使ったレシピ集を提出しました。結果は来月ですが、畑を見学できたのが一番の学びでした。",
        ko: "규격 외 토마토로 레시피집을 제출했어요. 결과는 다음 달이지만, 밭을 견학한 것이 가장 큰 배움이었어요.",
      },
      createdAt: at(-3, "13:15"), likes: 15, likedBy: [], mine: false,
    },
    {
      id: "po-8", kind: "brag", authorName: "Soyeon", authorLevel: levelOfStudent("cand-soyeon"), sdgIds: [4, 17],
      achievement: {
        activityId: null, kind: "participation", award: null, companyName: kotoba, sdgIds: [4, 17],
        title: { ja: "日韓の子どもをつなぐ多言語学習コンテンツ", ko: "한일 어린이를 잇는 다국어 학습 콘텐츠" },
      },
      body: {
        ja: "日本と韓国の子ども向けの、言葉あそび教材に挑戦中です。いっしょに作る仲間も募集しています！",
        ko: "일본과 한국 어린이를 위한 말놀이 교재에 도전 중이에요. 함께 만들 동료도 모집하고 있어요!",
      },
      createdAt: at(-4, "10:00"), likes: 8, likedBy: [], mine: false,
    },
  ];
}

/** 처음 상태 (today = "YYYY-MM-DD") */
export function createInitialState(today: string): DemoState {
  const cert = emptyCertAnswers();
  cert.ecoPackage = { value: 35, evidence: true };
  cert.renewable = { value: 20, evidence: true };
  cert.donation = { value: 120_000, evidence: true };
  cert.womenManagers = { value: 18, evidence: false };
  cert.volunteer = { value: 4, evidence: true };
  cert.disclosure = { value: 1, evidence: true };
  return {
    version: 1,
    today,
    seq: 100,
    me,
    myCompanyId: DEMO_COMPANY_ID,
    companies,
    challenges: buildChallenges(today),
    teamPosts: buildTeamPosts(today),
    bookmarks: ["ch-foodloss"],
    proposals: buildProposals(today),
    history: buildHistory(today),
    shares: 1,
    talent,
    scouts: buildScouts(today),
    matches: buildMatches(today),
    posts: buildPosts(today),
    cert,
    esgGeneratedOn: null,
  };
}
