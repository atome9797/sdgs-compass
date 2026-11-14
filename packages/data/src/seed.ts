// 데모용 샘플 데이터 (일본어·한국어). 기업·인물·수치는 모두 가상의 샘플이에요. 날짜는 "오늘" 기준 상대값이라 언제 열어도 D-day 가 자연스러워요.
// 실서비스에서는 이 모양의 데이터를 서버(PostgreSQL, db/schema.sql)가 돌려줘요.
import { emptyCertAnswers } from "@sdgs-compass/core/certification";
import type {
  Activity, Candidate, Challenge, Company, DemoState, Match, OfficialChannel, PrizePayment, Proposal, Rating, ResearcherProfile, ResearchRequest, ResearchResult, Scout, SocialPost,
  StudentProfile, TeamPost, Wallet, WorkRequest,
} from "@sdgs-compass/core/domain";
import { addDays } from "@sdgs-compass/core/format";
import { sha256Hex } from "@sdgs-compass/core/hash";
import { levelOf } from "@sdgs-compass/core/impact";
import { OFFICIAL_SHARE_FEE_YEN } from "@sdgs-compass/core/post";
import { resultFingerprint } from "@sdgs-compass/core/research";

export const DEMO_STUDENT_ID = "stu-mina";
export const DEMO_COMPANY_ID = "co-minato";
/** 데모의 연구자 계정(대학원생, 웹 데모의 세 번째 역할) */
export const DEMO_RESEARCHER_ID = "res-sora";

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
    certScore: null, // #35 SDGs 실천 마크 달성도 — 우리 회사(데모의 기업 계정): ESG 화면의 입력(cert)에서 계산해요 — 처음 53점 ★2.5
    emoji: "🐟",
    accent: "#0A97D9",
    offers: ["prototype", "manufacturing", "logistics"],
    offerNote: { ja: "水産加工品の試作・小ロット製造と、冷凍での保管", ko: "수산 가공품 시제품 · 소량 제조와 냉동 보관" },
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
    certScore: 84, // #35 SDGs 실천 마크 달성도 — 가상의 샘플 값: ★4.0
    emoji: "🛒",
    accent: "#3F7E44",
    offers: ["sales", "logistics"],
    offerNote: { ja: "店頭での販売テストと、首都圏の店舗への配送", ko: "매장 판매 테스트와 수도권 매장 배송" },
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
    certScore: 93, // #35 SDGs 실천 마크 달성도 — 가상의 샘플 값: ★4.5
    emoji: "☀️",
    accent: "#F5B700",
    offers: ["research", "other"],
    offerNote: { ja: "工場・店舗の省エネ診断と、再生可能エネルギーの電力", ko: "공장 · 매장 에너지 절약 진단과 재생에너지 전력" },
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
    certScore: 36, // #35 SDGs 실천 마크 달성도 — 가상의 샘플 값: ★1.5
    emoji: "🏘️",
    accent: "#FD9D24",
    offers: ["sales", "other"],
    offerNote: { ja: "空き店舗の短期の貸し出しと、地域イベントでの販売", ko: "빈 점포 단기 대여와 지역 행사 판매" },
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
    certScore: null, // #35 SDGs 실천 마크 달성도 — 아직 마크 없음(未取得) — 학생 화면에 마크가 보이지 않아요
    emoji: "🥬",
    accent: "#56C02B",
    offers: ["materials", "prototype"],
    offerNote: { ja: "規格外野菜の提供と、食品の試作", ko: "규격 외 채소 제공과 식품 시제품" },
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
    certScore: 71, // #35 SDGs 실천 마크 달성도 — 가상의 샘플 값: ★3.5
    emoji: "📚",
    accent: "#C5192D",
    offers: ["design", "research"],
    offerNote: { ja: "多言語の資料づくりと、アンケート調査", ko: "다국어 자료 제작과 설문 조사" },
  },
  {
    // 기업 네트워크의 시제품 · 제조 상대(가상). 과제는 아직 내지 않았고, 다른 기업의 의뢰로 신뢰를 쌓았어요
    id: "co-sakura",
    name: { ja: "さくらパック工業株式会社", ko: "사쿠라팩 공업(주)" },
    industry: { ja: "包装資材の製造", ko: "포장재 제조" },
    region: { ja: "静岡県", ko: "시즈오카현" },
    about: {
      ja: "紙とバイオマス素材の容器・トレーをつくる町工場。小ロットの試作が得意です。",
      ko: "종이와 바이오매스 소재 용기 · 트레이를 만드는 작은 공장. 소량 시제품을 잘 만들어요.",
    },
    sdgIds: [12, 9],
    verified: true,
    certScore: 62, // #35 SDGs 실천 마크 달성도 — 가상의 샘플 값: ★3.0
    emoji: "📦",
    accent: "#BF8B2E",
    offers: ["prototype", "manufacturing", "materials"],
    offerNote: { ja: "紙・バイオマス素材の容器とトレーの試作（20個から）と製造", ko: "종이 · 바이오매스 소재 용기와 트레이 시제품(20개부터)과 제조" },
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
        { ja: "企画書・発表資料（PDF・PPTX、10枚以内）", ko: "기획서 · 발표 자료(PDF · PPTX, 10장 이내)" },
        { ja: "効果の試算（減らせるプラスチックの量など）", ko: "효과 추정(줄일 수 있는 플라스틱의 양 등)" },
        { ja: "（任意）イメージ動画のURL", ko: "(선택) 이미지 영상 URL" },
      ],
      sdgIds: [14, 12],
      skills: ["design", "research", "planning"],
      prizeYen: 100_000,
      rewards: ["prize", "internship"],
      // 상품 보상(報酬アイテム, #37) — 가상의 상품 · 정가 상당액
      rewardItem: { name: { ja: "みなとの干物ギフトセット", ko: "미나토 건어물 선물 세트" }, retailYen: 5_000 },
      participation: "team",
      impactPoints: 120,
      opensOn: d(-32),
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
        { ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" },
        { ja: "売り場のイメージ図", ko: "매장 이미지 도안" },
      ],
      sdgIds: [12, 2],
      skills: ["marketing", "data"],
      prizeYen: 50_000,
      rewards: ["prize"],
      participation: "team",
      impactPoints: 100,
      opensOn: d(-34),
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
        { ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" },
        { ja: "（任意）60秒の紹介動画URL", ko: "(선택) 60초 소개 영상 URL" },
      ],
      sdgIds: [7, 13],
      skills: ["planning", "video", "writing"],
      prizeYen: 150_000,
      rewards: ["prize"],
      // 상품 보상(報酬アイテム, #37) — 가상의 상품 · 정가 상당액
      rewardItem: { name: { ja: "ソーラーパネルつきポータブル電源", ko: "태양광 패널 포함 휴대용 전원" }, retailYen: 30_000 },
      participation: "team",
      impactPoints: 140,
      opensOn: d(-29),
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
      deliverables: [{ ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" }, { ja: "SNS投稿のサンプル", ko: "SNS 게시물 샘플" }],
      sdgIds: [11, 8],
      skills: ["marketing", "video"],
      prizeYen: 80_000,
      rewards: ["prize", "internship"],
      participation: "team",
      impactPoints: 110,
      opensOn: d(-27),
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
      deliverables: [{ ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" }],
      sdgIds: [2, 12, 15],
      skills: ["design", "marketing"],
      prizeYen: 60_000,
      rewards: ["prize"],
      // 상품 보상(報酬アイテム, #37) — 가상의 상품 · 정가 상당액
      rewardItem: { name: { ja: "規格外野菜の定期便（3か月分）", ko: "규격 외 채소 정기 배송(3개월분)" }, retailYen: 9_000 },
      participation: "team",
      impactPoints: 100,
      opensOn: d(-26),
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
      deliverables: [{ ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" }, { ja: "（任意）試作のURL", ko: "(선택) 시제품 URL" }],
      sdgIds: [4, 10, 17],
      skills: ["languages", "programming", "design"],
      prizeYen: 100_000,
      rewards: ["prize", "offer"],
      participation: "team",
      impactPoints: 130,
      opensOn: d(-25),
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
      deliverables: [{ ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" }],
      sdgIds: [14, 8],
      skills: ["marketing", "programming"],
      prizeYen: 70_000,
      rewards: ["prize"],
      // 상품 보상(報酬アイテム, #37) — 가상의 상품 · 정가 상당액
      rewardItem: { name: { ja: "釣り船の乗船券（パーティ全員分）", ko: "낚싯배 승선권(파티 전원)" }, retailYen: 20_000 },
      participation: "team",
      impactPoints: 100,
      opensOn: d(-24),
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
      deliverables: [{ ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" }],
      sdgIds: [12, 14],
      skills: ["marketing", "design"],
      prizeYen: 50_000,
      rewards: ["prize"],
      participation: "team",
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
      summary: { ja: "終了した課題です。", ko: "종료된 챌린지예요." },
      background: { ja: "終了した課題です。", ko: "종료된 챌린지예요." },
      mission: { ja: "終了した課題です。", ko: "종료된 챌린지예요." },
      deliverables: [{ ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" }],
      sdgIds: [14, 11],
      skills: ["design"],
      prizeYen: 30_000,
      rewards: ["prize"],
      participation: "team",
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
      summary: { ja: "終了した課題です。", ko: "종료된 챌린지예요." },
      background: { ja: "終了した課題です。", ko: "종료된 챌린지예요." },
      mission: { ja: "終了した課題です。", ko: "종료된 챌린지예요." },
      deliverables: [{ ja: "企画書・発表資料（PDF・PPTX）", ko: "기획서 · 발표 자료(PDF · PPTX)" }],
      sdgIds: [14, 12],
      skills: ["video"],
      prizeYen: 30_000,
      rewards: ["prize"],
      participation: "team",
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

/** 샘플 기획서. team 은 인원(3~5명)과, 대학 수업 · 세미나에서 준비한 팀이면 세미나 · 수업 이름(모두 가상) */
function proposal(
  id: string, challengeId: string, teamName: string, title: string, summary: string, fileName: string, sizeBytes: number,
  at: string, status: Proposal["status"], review: Proposal["review"], seq: number, team: { size: number; seminar?: string },
): Proposal {
  return {
    id, challengeId, mine: false, teamName, teamSize: team.size, seminar: team.seminar ?? "", title, summary, videoUrl: "",
    versions: [{ no: 1, fileName, fileSizeBytes: sizeBytes, submittedAt: at, sha256: sha256Hex(`${fileName}|${sizeBytes}|${title}|${summary}|v1`) }],
    receiptNo: `SC-${at.slice(0, 10).replaceAll("-", "")}-${String(seq).padStart(4, "0")}`,
    submittedAt: at, status, review, award: null,
  };
}

function buildProposals(today: string): Proposal[] {
  const at = (n: number, time: string) => `${addDays(today, n)}T${time}`;
  const reviewed = (c: number, f: number, s: number, comment: string, n: number) => ({ creativity: c, feasibility: f, sdgContribution: s, comment, reviewedAt: at(n, "16:00") });
  return [
    proposal("pp-1", "ch-plastic", "クリーンシーサイド", "紙と海藻由来フィルムの二層包装", "プラスチックを使わない二層構造の包装を提案します。想定コストは現在の1.15倍です。", "clean_seaside.pdf", 3_200_000, at(-3, "20:12"), "submitted", null, 1, { size: 4, seminar: "海洋環境ゼミ（指導：山田先生）" }),
    proposal("pp-2", "ch-plastic", "ブルーループ", "漁港に空き容器の回収ボックスを設置", "漁港を訪れる人が空き容器をその場で返せる回収ボックスと、ポイント制度を提案します。", "blue_loop.pptx", 5_800_000, at(-2, "09:40"), "submitted", null, 2, { size: 5 }),
    proposal("pp-3", "ch-plastic", "もったいない研究会", "詰め替え式パッケージ＋QRで産地ストーリー", "詰め替えで包装を減らし、QRコードで漁師さんの紹介ページに案内します。", "mottainai_refill.pdf", 2_100_000, at(-1, "22:05"), "submitted", null, 3, { size: 3, seminar: "サステナビリティ経営ゼミ（指導：佐藤先生）" }),
    proposal("pb-1", "ch-bottle", "ボトルフレンズ", "キャンパス給水スポットマップ", "給水機の場所を地図にして、マイボトルを持ち歩く動機をつくります。", "bottle_friends.pdf", 2_400_000, at(-12, "18:20"), "reviewed", reviewed(4, 4, 5, "実行しやすく、効果も測りやすいです。", -1), 4, { size: 3 }),
    proposal("pb-2", "ch-bottle", "SEA-Cycle", "漁港マイボトルのデポジット制度", "マイボトルを持参した人に、デポジットの代わりに市場のクーポンを渡す仕組みを提案します。", "sea_cycle.pptx", 4_900_000, at(-10, "11:30"), "reviewed", reviewed(5, 3, 4, "アイデアが新鮮。運用コストの試算がほしいです。", -1), 5, { size: 4, seminar: "地域デザイン演習（授業）" }),
    proposal("pb-3", "ch-bottle", "エコダッシュ", "朝の通学路ボトル補充ステーション", "通学路に補充ステーションを置く企画です。", "eco_dash.pdf", 1_800_000, at(-9, "07:55"), "submitted", null, 6, { size: 3 }),
    proposal("pb-4", "ch-bottle", "でこぼこ", "マイボトルでスタンプラリー", "漁港のお店を回るスタンプラリーで、マイボトル持参を促します。", "dekoboko.pptx", 3_600_000, at(-6, "21:10"), "submitted", null, 7, { size: 5 }),
    proposal("pb-5", "ch-bottle", "Blue Link", "日韓の学生がつくる、マイボトル啓発ショート動画", "日本と韓国の学生が一緒に作ったショート動画で、マイボトルの習慣を広めます。", "blue_link.pdf", 6_300_000, at(-4, "14:25"), "submitted", null, 8, { size: 4 }),
  ];
}

/** 지난 채택(인턴 참가 결정) 2건 — 인턴 채용은 무료라서 돈은 오가지 않았어요 */
function buildMatches(today: string): Match[] {
  return [
    { id: "m-1", challengeId: "ch-old1", proposalId: "pp-old-1", companyId: "co-minato", matchedOn: addDays(today, -58) },
    { id: "m-2", challengeId: "ch-old2", proposalId: "pp-old-2", companyId: "co-minato", matchedOn: addDays(today, -88) },
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
  const scheduled = (n: number, channel: OfficialChannel) => ({ on: d(n), channel, feeYen: OFFICIAL_SHARE_FEE_YEN, status: "scheduled" as const, postUrl: null });
  // 운영자가 이미 올린 신청: 가상의 회사 글이라 특정 게시글이 아니라 공식 계정 주소로 이어져요 (postUrl = null → OFFICIAL_ACCOUNT_URLS)
  const posted = (n: number, channel: OfficialChannel) => ({ on: d(n), channel, feeYen: OFFICIAL_SHARE_FEE_YEN, status: "posted" as const, postUrl: null });
  const levelOfStudent = (id: string) => levelOf(talent.find((c) => c.id === id)?.points ?? 0);
  const minato = { ja: "みなと海洋フーズ株式会社", ko: "미나토 해양푸드(주)" };
  const hikari = { ja: "ひかりエナジー株式会社", ko: "히카리 에너지(주)" };
  const yasai = { ja: "やさい未来ファーム", ko: "야채 미래 팜" };
  const kotoba = { ja: "ことば教育サポート株式会社", ko: "코토바 교육 서포트(주)" };
  return [
    // 기업 홍보 글. 공식 SNS 게시 신청은 하루 제한이 없고 회사마다 한 달에 4번까지예요(채널 합계 — docs/sns-feed.md §3).
    // po-1 은 사흘 전에 공식 Instagram 에 이미 올라갔어요(게시 완료) — 학생·다른 기업에게도 「公式SNSで見る ↗」 링크가 보여요.
    // 내일 Instagram 에는 두 회사(po-3 · 우리 회사 po-4)가 함께 올라가고, X 는 모레(po-2)예요. 예정일·게시료는 쓴 회사에게만 보여요.
    // 우리 회사는 내일 1건을 이미 신청해 두어서, 새 글을 쓰면 기본 날짜(내일)가 속한 달의 남은 횟수가 「残り 3/4回」로 보여요.
    {
      id: "po-1", kind: "pr", companyId: "co-green", challengeId: "ch-foodloss", sdgIds: [12, 2],
      title: { ja: "売り場のフードロス、学生の発想で減らしませんか", ko: "매장의 푸드 로스, 학생의 발상으로 줄여 볼까요" },
      body: {
        ja: "賞味期限が近い商品をどう見せれば、手に取ってもらえるか。店舗での実験データを公開して、学生のみなさんの提案を待っています。",
        ko: "유통기한이 가까운 상품을 어떻게 보여 주면 손이 갈까요? 매장 실험 데이터를 공개하고 학생 여러분의 제안을 기다리고 있어요.",
      },
      official: posted(-3, "instagram"), createdAt: at(-4, "12:30"), likes: 18, likedBy: [], mine: false,
    },
    {
      id: "po-2", kind: "pr", companyId: "co-hikari", challengeId: "ch-solar", sdgIds: [7, 13],
      title: { ja: "寮の屋根を、学生と一緒に発電所に", ko: "기숙사 지붕을 학생과 함께 발전소로" },
      body: {
        ja: "再エネ導入のストーリーを、入居する学生の目線で企画してください。採用された企画は、実際の説明会で使います。",
        ko: "재생에너지 도입 이야기를 입주 학생의 시선으로 기획해 주세요. 채택된 기획은 실제 설명회에서 사용해요.",
      },
      official: scheduled(2, "x"), createdAt: at(-2, "15:00"), likes: 24, likedBy: [], mine: false,
    },
    {
      id: "po-3", kind: "pr", companyId: "co-machi", challengeId: "ch-shotengai", sdgIds: [11, 8],
      title: { ja: "空き店舗を、商店街の新しい顔に", ko: "빈 점포를 상점가의 새 얼굴로" },
      body: {
        ja: "シャッターが閉まったままの店舗を、SNSで人が集まる場所に変えたい。若い世代のアイデアを募集中です。",
        ko: "셔터가 내려간 점포를 SNS로 사람이 모이는 곳으로 바꾸고 싶어요. 젊은 세대의 아이디어를 모집 중이에요.",
      },
      official: scheduled(1, "instagram"), createdAt: at(-3, "11:10"), likes: 9, likedBy: [], mine: false,
    },
    {
      id: "po-4", kind: "pr", companyId: "co-minato", challengeId: "ch-bottle", sdgIds: [14, 12],
      title: { ja: "マイボトル企画、たくさんのご応募ありがとうございます", ko: "텀블러 기획, 많은 응모 감사합니다" },
      body: {
        ja: "5チームから個性的な提案が届きました。審査結果は近日お知らせします。海を守る仲間が増えるのが楽しみです。",
        ko: "5개 팀에서 개성 있는 제안이 도착했어요. 심사 결과는 곧 알려 드릴게요. 바다를 지키는 동료가 늘어나는 것이 기대돼요.",
      },
      official: scheduled(1, "instagram"), createdAt: at(-1, "18:20"), likes: 12, likedBy: [], mine: true,
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

/**
 * Mina 가 받은 돈의 기록 — 수상 실적(h-5b 優秀賞)에 이어진 기업 상금 1건(기업이 직접 지급) + 운영사 특별상(샘플) 1건.
 * 모두 가상의 금액이에요. 운영사 특별상은 실제로는 흑자가 된 뒤 기 말에 이익이 남을 때만 생겨요(docs/fees.md).
 */
function buildWallet(today: string): Wallet {
  const d = (n: number) => addDays(today, n);
  return {
    entries: [
      {
        id: "w-1", studentId: DEMO_STUDENT_ID, kind: "prize", amountYen: 30_000, date: d(-27),
        source: { kind: "prize", challengeId: null, activityId: "h-5b", companyId: "co-minato", title: { ja: "プラスチックごみ削減ハッカソン", ko: "플라스틱 쓰레기 감축 해커톤" }, award: "excellence" },
      },
      { id: "w-2", studentId: DEMO_STUDENT_ID, kind: "return", amountYen: 1_500, date: d(-10), source: { kind: "return", round: { ja: "運営からの特別賞（サンプル）", ko: "운영사 특별상(샘플)" } } },
    ],
  };
}

/**
 * 상금이 걸린 샘플 과제는 「표창 전」(과제를 연 날 상금을 걸었어요). 끝난 과제는 최우수상 팀에 지급(paid)했거나, 최우수상 없이 끝났어요(noWinner).
 * 상금은 기업이 팀에 직접 지급했어요 — 기업의 신뢰 실적(약속대로 지급한 상금)에 들어가요. 모두 가상.
 */
function buildPrizePayments(challenges: readonly Challenge[], today: string): PrizePayment[] {
  const settled: Record<string, Pick<PrizePayment, "status" | "paidOn" | "proposalId">> = {
    "ch-old1": { status: "paid", paidOn: addDays(today, -58), proposalId: "pp-old-1" },
    "ch-old2": { status: "noWinner", paidOn: null, proposalId: null },
  };
  return challenges
    .filter((c) => c.prizeYen > 0)
    .map((c): PrizePayment => {
      const open: Pick<PrizePayment, "status" | "paidOn" | "proposalId"> = { status: "promised", paidOn: null, proposalId: null };
      return { challengeId: c.id, companyId: c.companyId, amountYen: c.prizeYen, promisedOn: c.opensOn, ...(settled[c.id] ?? open) };
    });
}

/**
 * 기업 간 업무 의뢰 (기업 네트워크 — 모두 가상). 우리 회사(みなと)는
 * 받은 지명 의뢰 1건(답하기) · 낸 지명 의뢰 1건(납품 도착 → 확인하고 완료 · 평가) · 낸 공개 모집 1건(응모 2곳 → 고르기) · 끝난 거래 1건이 있고,
 * 다른 기업의 공개 모집 1건에 응모할 수 있어요. 나머지는 다른 기업끼리의 끝난 거래(신뢰 실적)예요.
 */
function buildWorkRequests(today: string): WorkRequest[] {
  const d = (n: number) => addDays(today, n);
  const base: Pick<WorkRequest, "applications" | "acceptedOn" | "deliveredOn" | "deliveryNote" | "completedOn"> = { applications: [], acceptedOn: null, deliveredOn: null, deliveryNote: null, completedOn: null };
  const done = (accepted: number, delivered: number, completed: number, note: { ja: string; ko: string }) =>
    ({ status: "completed", acceptedOn: d(accepted), deliveredOn: d(delivered), deliveryNote: note, completedOn: d(completed) }) as const;
  return [
    {
      ...base,
      id: "wr-1",
      mode: "direct",
      fromCompanyId: "co-green",
      toCompanyId: "co-minato",
      category: "manufacturing",
      title: { ja: "店頭テスト用の干物ギフト（簡易包装）100セット", ko: "매장 테스트용 건어물 선물(간이 포장) 100세트" },
      detail: {
        ja: "首都圏の3店舗で、プラスチックを減らした簡易包装の干物ギフトを試験販売します。紙の外箱は当社で用意します。中身の製造と箱詰めをお願いします。",
        ko: "수도권 3개 매장에서 플라스틱을 줄인 간이 포장 건어물 선물을 시험 판매해요. 종이 외상자는 저희가 준비해요. 내용물 제조와 포장을 부탁해요.",
      },
      budgetYen: 150_000,
      postedOn: d(-2),
      dueOn: d(30),
      status: "requested",
    },
    {
      ...base,
      id: "wr-2",
      mode: "direct",
      fromCompanyId: "co-minato",
      toCompanyId: "co-sakura",
      category: "prototype",
      title: { ja: "紙と生分解樹脂のトレーを2種類、20個ずつ試作", ko: "종이와 생분해 수지 트레이 2종을 20개씩 시제품으로" },
      detail: {
        ja: "干物の包装に使うトレーを、紙と生分解樹脂の2種類で試作してください。冷凍・解凍で形が崩れないかを当社で試します。",
        ko: "건어물 포장에 쓸 트레이를 종이와 생분해 수지 두 가지로 시제품을 만들어 주세요. 냉동 · 해동에서 모양이 무너지지 않는지 저희가 시험해요.",
      },
      budgetYen: 120_000,
      postedOn: d(-20),
      dueOn: d(10),
      status: "delivered",
      acceptedOn: d(-18),
      deliveredOn: d(-1),
      deliveryNote: {
        ja: "2種類のトレーを20個ずつお送りしました。紙のトレーは水分に弱いので、内側のコーティングを2案用意しています。",
        ko: "두 종류의 트레이를 20개씩 보냈어요. 종이 트레이는 수분에 약해서 안쪽 코팅을 두 가지 안으로 준비했어요.",
      },
    },
    {
      ...base,
      id: "wr-3",
      mode: "open",
      fromCompanyId: "co-hikari",
      toCompanyId: null,
      category: "manufacturing",
      title: { ja: "社員食堂向け、地元の魚の加工品（試験導入・月200食分）", ko: "사내 식당용 지역 생선 가공품(시험 도입 · 월 200식분)" },
      detail: {
        ja: "千葉の発電所の社員食堂で、地元の魚を使ったメニューを3か月試します。骨を取った切り身や総菜を、月200食分届けられる企業を探しています。",
        ko: "지바 발전소 사내 식당에서 지역 생선 메뉴를 3개월 시험해요. 뼈를 바른 토막이나 반찬을 월 200식분 보내 줄 수 있는 기업을 찾고 있어요.",
      },
      budgetYen: 200_000,
      postedOn: d(-5),
      dueOn: d(40),
      status: "open",
    },
    {
      ...base,
      id: "wr-4",
      mode: "open",
      fromCompanyId: "co-minato",
      toCompanyId: null,
      category: "logistics",
      title: { ja: "回収した漁網の運搬と一時保管（月2回・3か月）", ko: "회수한 어망 운반과 임시 보관(월 2회 · 3개월)" },
      detail: {
        ja: "漁港の清掃で回収した漁網を、月2回、港から保管場所まで運び、再生業者に渡すまで保管してください。1回あたり約200kgです。",
        ko: "어항 청소로 회수한 어망을 월 2회 항구에서 보관 장소까지 옮기고, 재생 업체에 넘길 때까지 보관해 주세요. 1회에 약 200kg이에요.",
      },
      budgetYen: 90_000,
      postedOn: d(-7),
      dueOn: d(45),
      status: "open",
      applications: [
        { companyId: "co-green", message: { ja: "港から当社の倉庫まで、月2回の運搬と保管ができます。", ko: "항구에서 저희 창고까지 월 2회 운반과 보관을 할 수 있어요." }, appliedOn: d(-6) },
        { companyId: "co-sakura", message: { ja: "工場の空きスペースで保管できます（運搬は提携先に頼みます）。", ko: "공장의 빈 공간에 보관할 수 있어요(운반은 협력 업체에 맡겨요)." }, appliedOn: d(-4) },
      ],
    },
    {
      ...base,
      id: "wr-5",
      mode: "direct",
      fromCompanyId: "co-minato",
      toCompanyId: "co-green",
      category: "sales",
      title: { ja: "干物の店頭販売テスト（2週間）", ko: "건어물 매장 판매 테스트(2주)" },
      detail: { ja: "学生のアイデアから生まれた干物の新しい包装を、2店舗で2週間売ってみてください。", ko: "학생 아이디어에서 나온 건어물 새 포장을 2개 매장에서 2주 동안 팔아 봐 주세요." },
      budgetYen: 100_000,
      postedOn: d(-60),
      dueOn: d(-30),
      ...done(-58, -35, -33, { ja: "2店舗で2週間販売し、売れ行きと売り場の写真をまとめました。", ko: "2개 매장에서 2주 동안 팔고 판매 추이와 매장 사진을 정리했어요." }),
    },
    {
      ...base,
      id: "wr-6",
      mode: "direct",
      fromCompanyId: "co-kotoba",
      toCompanyId: "co-machi",
      category: "other",
      title: { ja: "空き店舗を使った多言語ワークショップの会場（3日間）", ko: "빈 점포를 쓴 다국어 워크숍 장소(3일)" },
      detail: { ja: "親子向けの多言語ワークショップを、商店街の空き店舗で3日間開きます。会場の準備をお願いします。", ko: "부모와 아이를 위한 다국어 워크숍을 상점가 빈 점포에서 3일 열어요. 장소 준비를 부탁해요." },
      budgetYen: 60_000,
      postedOn: d(-40),
      dueOn: d(-22),
      ...done(-38, -23, -20, { ja: "3日間の会場を用意し、片付けまで終えました。", ko: "3일간 장소를 준비하고 정리까지 마쳤어요." }),
    },
    {
      ...base,
      id: "wr-7",
      mode: "direct",
      fromCompanyId: "co-hikari",
      toCompanyId: "co-kotoba",
      category: "design",
      title: { ja: "工場見学パンフレットの英語・韓国語版", ko: "공장 견학 팸플릿 영어 · 한국어판" },
      detail: { ja: "発電所の見学パンフレット（8ページ）を、英語と韓国語に翻訳してレイアウトしてください。", ko: "발전소 견학 팸플릿(8쪽)을 영어와 한국어로 번역하고 레이아웃해 주세요." },
      budgetYen: 80_000,
      postedOn: d(-65),
      dueOn: d(-45),
      ...done(-63, -48, -45, { ja: "英語版・韓国語版のデータ（PDF）をお送りしました。", ko: "영어판 · 한국어판 데이터(PDF)를 보냈어요." }),
    },
    {
      ...base,
      id: "wr-8",
      mode: "direct",
      fromCompanyId: "co-green",
      toCompanyId: "co-sakura",
      category: "prototype",
      title: { ja: "量り売り用の紙容器の試作（3サイズ）", ko: "무게 판매용 종이 용기 시제품(3가지 크기)" },
      detail: { ja: "店頭の量り売りに使う紙の容器を、3サイズで試作してください。", ko: "매장 무게 판매에 쓸 종이 용기를 세 가지 크기로 시제품을 만들어 주세요." },
      budgetYen: 150_000,
      postedOn: d(-95),
      dueOn: d(-70),
      ...done(-93, -74, -70, { ja: "3サイズを各30個お送りしました。", ko: "세 가지 크기를 30개씩 보냈어요." }),
    },
  ];
}

/**
 * 상호 평가 (모두 가상). 신뢰 실적: みなと(상금 지급 + 끝난 거래 · ★5.0) · グリーンリテール · さくらパック · ひかり · ことば · まちづくり 는 신뢰 기업이고,
 * やさい未来ファーム 는 아직 거래가 없어서 「これから」예요.
 */
function buildRatings(today: string): Rating[] {
  const d = (n: number) => addDays(today, n);
  const company = (id: string, refId: string, fromId: string, toId: string, stars: number, comment: { ja: string; ko: string }, on: number): Rating => ({
    id, kind: "work", refId, fromRole: "company", fromId, toRole: "company", toId, stars, comment, createdOn: d(on),
  });
  return [
    {
      id: "ra-1", kind: "prize", refId: "ch-old1", fromRole: "student", fromId: "stu-sample-blue", toRole: "company", toId: "co-minato", stars: 5,
      comment: { ja: "審査のコメントが具体的で、賞金もすぐに届きました。", ko: "심사 코멘트가 구체적이었고 상금도 바로 받았어요." }, createdOn: d(-56),
    },
    company("ra-2", "wr-5", "co-green", "co-minato", 5, { ja: "支払いが早く、商品の説明も丁寧でした。", ko: "지급이 빠르고 상품 설명도 친절했어요." }, -32),
    company("ra-3", "wr-5", "co-minato", "co-green", 5, { ja: "売り場の写真と売れ行きの記録まで共有してもらえました。", ko: "매장 사진과 판매 기록까지 공유해 주었어요." }, -32),
    company("ra-4", "wr-6", "co-kotoba", "co-machi", 4, { ja: "会場の準備がスムーズでした。", ko: "장소 준비가 매끄러웠어요." }, -19),
    company("ra-5", "wr-6", "co-machi", "co-kotoba", 5, { ja: "参加者の案内まで手伝ってもらえました。", ko: "참가자 안내까지 도와주었어요." }, -19),
    company("ra-6", "wr-7", "co-hikari", "co-kotoba", 5, { ja: "専門用語もわかりやすく訳してもらえました。", ko: "전문 용어도 알기 쉽게 번역해 주었어요." }, -44),
    company("ra-7", "wr-7", "co-kotoba", "co-hikari", 4, { ja: "資料の提供が早く、進めやすかったです。", ko: "자료를 빨리 주어서 진행하기 쉬웠어요." }, -44),
    company("ra-8", "wr-8", "co-green", "co-sakura", 4, { ja: "試作が早く、改良にも柔軟に対応してもらえました。", ko: "시제품이 빨랐고 개선에도 유연하게 대응해 주었어요." }, -69),
    company("ra-9", "wr-8", "co-sakura", "co-green", 5, { ja: "仕様が明確で、支払いも予定どおりでした。", ko: "사양이 명확했고 지급도 예정대로였어요." }, -69),
    {
      id: "ra-10", kind: "research", refId: "rr-5", fromRole: "researcher", fromId: DEMO_RESEARCHER_ID, toRole: "company", toId: "co-machi", stars: 5,
      comment: { ja: "調査の目的と条件が明確で、確認も早かったです。", ko: "조사 목적과 조건이 명확했고 확인도 빨랐어요." }, createdOn: d(-40),
    },
    {
      id: "ra-11", kind: "research", refId: "rr-5", fromRole: "company", fromId: "co-machi", toRole: "researcher", toId: DEMO_RESEARCHER_ID, stars: 5,
      comment: { ja: "データの整理が丁寧で、すぐに使えました。", ko: "데이터 정리가 꼼꼼해서 바로 쓸 수 있었어요." }, createdOn: d(-40),
    },
  ];
}

/** 데모의 연구자 계정(대학원생). 이름·소속은 가상의 샘플이에요 */
const researcher: ResearcherProfile = {
  id: DEMO_RESEARCHER_ID,
  name: "Sora",
  affiliation: { ja: "サンプル大学大学院 環境科学研究科", ko: "샘플대학교 대학원 환경과학연구과" },
  degree: "master",
  year: 1,
  fields: ["environment", "materials", "data"],
  bio: {
    ja: "海洋プラスチックの劣化と、回収した素材の再利用を研究しています。統計の分析も得意です。",
    ko: "해양 플라스틱의 열화와 회수한 소재의 재활용을 연구하고 있어요. 통계 분석도 잘해요.",
  },
};

/**
 * 연구 의뢰 샘플 5건 (회사·아이디어·금액 모두 가상):
 * - 우리 회사(rr-1)는 성과가 도착해 확인 대기 — 기업 데모에서 「成果を確認して完了にする」를 눌러 볼 수 있어요.
 *   출발점은 지난 과제(ch-old1, 漁港清掃ポスター)에서 표창된 아이디어예요(피드의 Yuna 글과 같은 과제).
 * - 다른 회사 2건(rr-2 · rr-3)은 모집 중 — 연구자 데모에서 맡아 볼 수 있어요.
 * - 연구자(Sora)가 연구 중 1건(rr-4) · 완료 1건(rr-5).
 * 의뢰비는 샘플 값이에요(실제 기준과 운영 수수료는 대학원생 설문 뒤에 정해요 — docs/research.md).
 */
function buildResearchRequests(today: string): ResearchRequest[] {
  const d = (n: number) => addDays(today, n);
  const result = (requestId: string, summary: string, fileName: string, fileSizeBytes: number, day: number, time: string): ResearchResult => ({
    summary,
    fileName,
    fileSizeBytes,
    sha256: resultFingerprint(requestId, { summary, fileName, fileSizeBytes }),
    submittedAt: `${d(day)}T${time}`,
  });
  const none = { researcherId: null, acceptedOn: null, result: null, completedOn: null } as const;
  return [
    {
      id: "rr-1",
      companyId: "co-minato",
      origin: { proposalId: null, challengeId: "ch-old1", ideaTitle: "海の青で呼びかける漁港清掃ポスター", teamName: "ブルーポスターズ" },
      title: { ja: "漁港清掃で集めた釣り糸・漁網を、再生素材にできるかの調査", ko: "어항 청소로 모은 낚싯줄·어망을 재생 소재로 쓸 수 있는지 조사" },
      detail: {
        ja: "清掃活動で集めた釣り糸・漁網の種類と量を記録し、洗浄・分別の手間と劣化の程度から、再生素材として使えるかを文献と簡単な試験で調べてください。",
        ko: "청소 활동으로 모은 낚싯줄·어망의 종류와 양을 기록하고, 세척·분별의 수고와 열화 정도로 보아 재생 소재로 쓸 수 있는지 문헌과 간단한 시험으로 조사해 주세요.",
      },
      deliverable: { ja: "調査報告書（PDF・10ページ程度）と記録データ（CSV）", ko: "조사 보고서(PDF·10쪽 정도)와 기록 데이터(CSV)" },
      fields: ["environment", "materials"],
      feeYen: 80_000,
      postedOn: d(-26),
      dueOn: d(6),
      status: "delivered",
      researcherId: DEMO_RESEARCHER_ID,
      acceptedOn: d(-22),
      result: result(
        "rr-1",
        "3回の清掃で集めた釣り糸・漁網12.4kgを種類別に記録しました。ナイロンの釣り糸は洗浄すれば再生材料にできる見込みが高く、漁網は金具の取り外しに手間がかかることが分かりました。",
        "harbor_line_report.pdf",
        4_200_000,
        -2,
        "18:30",
      ),
      completedOn: null,
    },
    {
      id: "rr-2",
      companyId: "co-green",
      origin: { proposalId: null, challengeId: null, ideaTitle: "閉店前の見切り品をアプリで予約", teamName: "もったいないキッチン" },
      title: { ja: "値引きを始める時間と売れ残りの関係を、販売データで分析", ko: "할인을 시작하는 시간과 남는 상품의 관계를 판매 데이터로 분석" },
      detail: {
        ja: "3店舗・半年分の販売データ（個人情報は含みません）から、値引きを始める時間と売れ残りの量の関係を分析してください。アプリで予約を受けた場合の効果も試算してください。",
        ko: "3개 매장·반년 치 판매 데이터(개인정보는 포함하지 않아요)로 할인을 시작하는 시간과 남는 양의 관계를 분석해 주세요. 앱으로 예약을 받는 경우의 효과도 추정해 주세요.",
      },
      deliverable: { ja: "分析レポート（PDF）と、分析に使ったコード・集計表", ko: "분석 보고서(PDF)와 분석에 쓴 코드·집계표" },
      fields: ["data", "food"],
      feeYen: 60_000,
      postedOn: d(-3),
      dueOn: d(42),
      status: "open",
      ...none,
    },
    {
      id: "rr-3",
      companyId: "co-hikari",
      origin: { proposalId: null, challengeId: null, ideaTitle: "家族で競う省エネチャレンジ", teamName: "ワットウォッチ" },
      title: { ja: "省エネを続けてもらう仕掛けの効果を、アンケートで確かめる", ko: "에너지 절약을 계속하게 하는 장치의 효과를 설문으로 확인" },
      detail: {
        ja: "家庭向けの省エネ企画に参加した約200世帯に、続けられた理由・やめた理由を聞くアンケートを設計し、結果を分析してください。",
        ko: "가정 대상 에너지 절약 기획에 참가한 약 200가구에 계속한 이유·그만둔 이유를 묻는 설문을 설계하고 결과를 분석해 주세요.",
      },
      deliverable: { ja: "アンケート票・集計結果・考察のまとめ（PDF）", ko: "설문지·집계 결과·고찰 정리(PDF)" },
      fields: ["social", "energy", "data"],
      feeYen: 120_000,
      postedOn: d(-6),
      dueOn: d(60),
      status: "open",
      ...none,
    },
    {
      id: "rr-4",
      companyId: "co-yasai",
      origin: { proposalId: null, challengeId: null, ideaTitle: "規格外野菜のピクルスを駅ナカで販売", teamName: "ベジリンク" },
      title: { ja: "出荷の記録から、規格外野菜の廃棄を減らせる量を試算する", ko: "출하 기록으로 규격 외 채소의 폐기를 줄일 수 있는 양을 추정" },
      detail: {
        ja: "1年分の収穫・出荷の記録（表計算）から、規格外で廃棄している野菜の量を品目別に集計し、ピクルスに加工した場合に減らせる量と費用の目安を試算してください。",
        ko: "1년 치 수확·출하 기록(스프레드시트)으로 규격 외라서 폐기하는 채소의 양을 품목별로 집계하고, 피클로 가공하면 줄일 수 있는 양과 비용의 기준을 추정해 주세요.",
      },
      deliverable: { ja: "集計と試算のまとめ（PDF）と、計算に使った表（XLSX）", ko: "집계와 추정 정리(PDF)와 계산에 쓴 표(XLSX)" },
      fields: ["food", "data"],
      feeYen: 50_000,
      postedOn: d(-15),
      dueOn: d(18),
      status: "inProgress",
      researcherId: DEMO_RESEARCHER_ID,
      acceptedOn: d(-12),
      result: null,
      completedOn: null,
    },
    {
      id: "rr-5",
      companyId: "co-machi",
      origin: { proposalId: null, challengeId: null, ideaTitle: "空き店舗でリペアカフェを開く", teamName: "まちのなおし屋" },
      title: { ja: "商店街の通行量を、曜日・時間帯別に調べる", ko: "상점가 통행량을 요일·시간대별로 조사" },
      detail: {
        ja: "平日と休日の各3日、商店街の4か所で通行量を数え、空き店舗の前を通る人の数と時間帯の特徴をまとめてください。",
        ko: "평일과 휴일 각 3일, 상점가 네 곳에서 통행량을 세고 빈 점포 앞을 지나는 사람 수와 시간대 특징을 정리해 주세요.",
      },
      deliverable: { ja: "調査報告書（PDF）と集計データ（CSV）", ko: "조사 보고서(PDF)와 집계 데이터(CSV)" },
      fields: ["social", "data"],
      feeYen: 40_000,
      postedOn: d(-80),
      dueOn: d(-40),
      status: "completed",
      researcherId: DEMO_RESEARCHER_ID,
      acceptedOn: d(-76),
      result: result(
        "rr-5",
        "平日と休日の各3日、4か所で通行量を数えました。休日の午後は平日の約2倍でした。空き店舗の前は通行量が少なく、入口の見せ方に工夫の余地があります。",
        "shotengai_traffic.pdf",
        2_800_000,
        -45,
        "20:10",
      ),
      completedOn: d(-41),
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
  const challenges = buildChallenges(today);
  return {
    version: 1,
    today,
    seq: 100,
    me,
    myCompanyId: DEMO_COMPANY_ID,
    companies,
    challenges,
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
    wallet: buildWallet(today),
    prizePayments: buildPrizePayments(challenges, today),
    researcher,
    researchRequests: buildResearchRequests(today),
    workRequests: buildWorkRequests(today),
    ratings: buildRatings(today),
  };
}
