// 도메인 타입. db/schema.sql(PostgreSQL)의 테이블과 대응해요 — README 의 ERD 참고.
// 데모는 이 타입의 샘플 데이터(packages/data/src/seed.ts)로 동작하고, 실서비스에서는 같은 모양을 서버 API 가 돌려줘요.
import type { LocalizedText, Text } from "./i18n";
import type { SdgId } from "./sdg";

/**
 * 사용자 역할 (기능명세 3장: B2C 일반회원 / B2B 기업·기관 / Admin 은 데모 범위 밖).
 * researcher = 기업의 연구 의뢰를 맡는 대학원생 — 웹 데모에만 있어요(모바일 앱은 학생·기업 두 역할 그대로). 아래 ResearchRequest 참고.
 */
export type Role = "b2c" | "b2b" | "researcher";

export const SKILL_IDS = ["design", "marketing", "programming", "data", "research", "writing", "video", "planning", "languages", "finance"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export type ChallengeStatus = "open" | "judging" | "closed";
export type Participation = "individual" | "team" | "both";
export type RewardKind = "prize" | "internship" | "offer";

/**
 * 퀘스트(과제)의 상품 보상 「報酬アイテム」(#37): 기업이 고른 팀에게 직접 건네는 자사 상품 · 서비스.
 * 상금(prizeYen)과 함께 걸 수도 있고 상품만 걸 수도 있어요. retailYen 은 정가 상당액(화면 표시용, 샘플은 가상의 값).
 * DB(db/schema.sql)에는 아직 열이 없어요 — 보상 종류(reward_kind)와 스키마는 그대로 둬요.
 */
export interface RewardItem {
  name: Text;
  retailYen: number;
}

/** 전투 화면 · 의뢰서의 몬스터 모양 (픽셀 그림 이름과 같아요 — packages/core/src/sprites.ts) */
export type FoeKind = "jelly" | "bottle" | "smog" | "ghost" | "wall" | "bird";

/** 퀘스트가 맞서는 과제를 몬스터로 (#38): 예) 海洋プラスチック → 「プラごみクラゲ」 */
export interface QuestFoe {
  name: Text;
  kind: FoeKind;
}

export interface Company {
  id: string;
  name: Text;
  industry: Text;
  region: Text;
  about: Text;
  sdgIds: SdgId[];
  verified: boolean;
  /**
   * SDGs 실천 마크의 달성도(0~100, 가상의 샘플 값) — 별 수는 certification.ts 의 certStarsOf 로 계산해요(#35). null = 마크 없음(未取得).
   * 데모의 우리 회사(DemoState.myCompanyId)는 이 값 대신 ESG 화면의 입력(DemoState.cert)으로 계산해요.
   * DB 에서는 회사마다 지금 유효한 부여 신청의 점수예요(뷰 company_cert_marks).
   */
  certScore: number | null;
  /** 데모용 로고 대신 쓰는 이모지와 배경색 */
  emoji: string;
  accent: string;
  /** 기업 네트워크에서 「할 수 있는 일」(다른 기업의 업무 의뢰를 받을 수 있는 분야, 없으면 빈 배열) */
  offers: WorkCategory[];
  /** 할 수 있는 일 한 줄 (기업이 쓴 글) */
  offerNote: Text;
}

/** F-201 챌린지 (기업이 출제하는 SDGs 과제) */
export interface Challenge {
  id: string;
  companyId: string;
  title: Text;
  summary: Text;
  background: Text;
  mission: Text;
  deliverables: Text[];
  sdgIds: SdgId[];
  skills: SkillId[];
  prizeYen: number;
  rewards: RewardKind[];
  /** 상품 보상(報酬アイテム) — 없으면 상금 · 인턴 등 rewards 만 (#37) */
  rewardItem?: RewardItem;
  /** 이 퀘스트에서 수상하면 얻는 스킬의 이름(#38). 없으면 퀘스트 이름을 그대로 써요 */
  skillName?: Text;
  /** 전투 화면(#38)에 나오는 「과제 몬스터」. 없으면 대표 SDG 로 정한 기본 몬스터(battle.ts 의 defaultFoe) */
  foe?: QuestFoe;
  participation: Participation;
  /** 참가·제출로 얻는 Impact 포인트의 기본값 (예: +120 pt) */
  impactPoints: number;
  opensOn: string;
  closesOn: string;
  status: ChallengeStatus;
  /** 응모자 수 (샘플 값 + 데모에서 내가 제출한 만큼) */
  applicants: number;
  /** 표지 그라데이션 색상(0~360) */
  hue: number;
}

/** F-102 B2C 프로필 (관심 SDGs 는 우선순위 순서로 최대 5개) */
export interface StudentProfile {
  id: string;
  nickname: string;
  university: Text;
  faculty: Text;
  gradYear: number;
  skills: SkillId[];
  sdgInterests: SdgId[];
  scoutable: boolean;
  bio: Text;
}

/** F-203 팀 빌딩 게시판 글 */
export interface TeamPost {
  id: string;
  challengeId: string;
  authorName: string;
  /** 글쓴이가 가진 스킬 수(#38 — 레벨 대신). 글을 올린 때의 값 */
  authorSkills: number;
  title: Text;
  body: Text;
  rolesWanted: SkillId[];
  sdgIds: SdgId[];
  createdOn: string;
  requests: number;
  mine: boolean;
  requestedByMe: boolean;
}

/** F-302 기획서 버전 (마감까지 다시 제출하면 버전이 쌓여요) */
export interface ProposalVersion {
  no: number;
  fileName: string;
  fileSizeBytes: number;
  submittedAt: string;
  /** 파일 지문 (데모에서는 파일 이름·크기·요약으로 만든 SHA-256) */
  sha256: string;
}

/** F-303 심사 점수 (1~5점, 창의성·실현가능성·SDGs 기여도) */
export interface Review {
  creativity: number;
  feasibility: number;
  sdgContribution: number;
  comment: string;
  reviewedAt: string;
}

export type AwardKind = "grand" | "excellence" | "special";
export type ProposalStatus = "submitted" | "reviewed" | "awarded" | "adopted";

/** F-301 기획서 제출 */
export interface Proposal {
  id: string;
  challengeId: string;
  mine: boolean;
  teamName: string;
  /** 팀 인원 3~5명(대학생 · 대학원생). 이 항목이 생기기 전에 저장된 데모 상태는 샘플 값(샘플에 없으면 3명)으로 채워요 */
  teamSize: number;
  /** 세미나 · 수업 이름(지도 교수) — 학생이 쓴 글 그대로. 빈 문자열이면 세미나 없이 응모(기업 화면의 「ゼミで参加」 표시가 없어요) */
  seminar: string;
  title: string;
  summary: string;
  videoUrl: string;
  versions: ProposalVersion[];
  /** 제출 수령증 번호 (SC-YYYYMMDD-NNNN) */
  receiptNo: string;
  submittedAt: string;
  status: ProposalStatus;
  review: Review | null;
  award: AwardKind | null;
}

export type ActivityKind = "participation" | "submission" | "award" | "share";

/**
 * 용사의 스킬(#38): 수상 1건 = 스킬 1개. 레벨 대신, 수상 경력을 SDG 번호와 함께 저장하고 보여 줘요.
 * 수상한 때의 스킬 이름 · 퀘스트 이름 · 기업 이름 · SDG 번호를 그대로 적어 두는 스냅샷이에요(증명서와 같은 방식 — 나중에 퀘스트를 고쳐도 스킬은 그대로).
 * activityId 는 그 수상 활동(Activity kind "award")의 id 라서 증명서 · 카드뉴스와 이어져요. DB 는 hero_skills 표.
 */
export interface HeroSkill {
  id: string;
  name: Text;
  /** 퀘스트의 SDG 번호 그대로(첫 번째가 대표 — 화면의 색 · 「タイプ」) */
  sdgIds: SdgId[];
  award: AwardKind;
  questTitle: Text;
  companyName: Text;
  /** 수상한 날 (YYYY-MM-DD) */
  learnedOn: string;
  activityId: string;
  /** 이 앱에서 낸 기획서의 수상이면 그 기획서 id (앱을 쓰기 전 기록이면 없음) */
  proposalId?: string;
}

/** F-401 Impact Index 의 재료: 참가·제출·수상·공유 기록 */
export interface Activity {
  id: string;
  kind: ActivityKind;
  title: Text;
  companyName: Text;
  sdgIds: SdgId[];
  date: string;
  points: number;
  scores?: { creativity: number; feasibility: number; sdgContribution: number };
  award?: AwardKind;
  proposalId?: string;
}

export type ScoutKind = "internship" | "offer" | "interview";
export type ScoutStatus = "sent" | "read" | "accepted" | "declined";

/** F-602 스카우트 제안 (기업 → 학생) */
export interface Scout {
  id: string;
  companyId: string;
  studentId: string;
  kind: ScoutKind;
  message: Text;
  sentAt: string;
  status: ScoutStatus;
}

/** F-601 인재 검색 결과 (다른 학생의 공개 요약) */
export interface Candidate {
  id: string;
  nickname: string;
  university: Text;
  faculty: Text;
  skills: SkillId[];
  sdgInterests: SdgId[];
  points: number;
  awards: number;
  scoutable: boolean;
  bio: Text;
}

/**
 * 채택 1건 = 기업이 고른 학생 팀의 인턴 참가가 정해졌어요. 인턴 채용은 무료라서 돈은 오가지 않아요(2026-11-08 — 수수료는 fees.ts 의 상금·연구 의뢰비만).
 * (DB 의 matches 표에는 이전 모델의 수수료 열이 아직 있어요 — docs/fees.md)
 */
export interface Match {
  id: string;
  challengeId: string;
  proposalId: string;
  companyId: string;
  matchedOn: string;
}

/** SNS 피드 글의 종류: brag = 학생이 올리는 실적 자랑(F-503), pr = 기업이 올리는 홍보(F-504). 설계는 docs/sns-feed.md */
export type PostKind = "brag" | "pr";

/** 자랑 글에 붙는 실적 한 건. 활동 기록(Activity)의 사본이라서, 다른 학생의 샘플 글도 같은 모양으로 보여 줄 수 있어요 */
export interface PostAchievement {
  /** 내 활동(Activity)의 id. 다른 학생의 샘플 글은 null (DB 에서는 social_posts.activity_id) */
  activityId: string | null;
  kind: Exclude<ActivityKind, "share">;
  title: Text;
  companyName: Text;
  award: AwardKind | null;
  sdgIds: SdgId[];
}

/**
 * 공식 SNS 게시 신청을 받는 채널. 운영하는 공식 SNS 는 X · Instagram · Facebook 이에요(화면 순서는 post.ts 의 OFFICIAL_CHANNELS).
 * YouTube 는 영상 채널이라 신청 대상이 아니에요. DB 에서는 열거형 official_channel.
 */
export type OfficialChannel = "instagram" | "x" | "facebook";

/**
 * 기업 홍보 글의 공식 SNS 게시 신청. 하루 제한은 없고(같은 날·같은 채널에 여러 회사), 한 회사는 게시일이 속한 달에 4번까지예요(채널 합계 — post.ts 의 OFFICIAL_SHARE_MONTHLY_LIMIT).
 * 예정일·게시료는 글을 쓴 회사에게만 보이고, 다른 사람에게는 게시된 뒤에 링크만 보여요(selectors.ts 의 PostVM.official).
 */
export interface OfficialShare {
  /** 게시 날짜 (YYYY-MM-DD) — 기업이 내일부터 30일 뒤까지에서 골라요 */
  on: string;
  /** 게시할 공식 SNS. 채널을 고르기 전에 저장된 옛 데모 상태에는 없어서, 불러올 때 instagram 으로 채워요 (storage.ts) */
  channel: OfficialChannel;
  feeYen: number;
  /**
   * scheduled = 게시 예정, posted = 운영자가 공식 SNS 에 올렸어요. 앱에서 새로 신청하면 늘 scheduled 이고,
   * posted 로 바꾸는(게시글 주소를 넣는) 운영 화면은 서버 버전에서 만들어요 — 데모에서는 샘플에만 있어요. 취소(DB 의 cancelled)는 앱에 없어요(글을 지우면 사라져요).
   */
  status: "scheduled" | "posted";
  /** 게시된 글의 주소 (posted 일 때만, https:// 로 시작). 없으면 null → 그 채널의 공식 계정 주소로 이어 줘요 (post.ts 의 officialShareLink) */
  postUrl: string | null;
}

interface PostBase {
  id: string;
  /** 사람이 쓴 글: 내가 쓴 글은 쓴 언어 그대로(string), 샘플은 두 언어 (자동 번역은 하지 않아요) */
  body: Text;
  sdgIds: SdgId[];
  /** YYYY-MM-DDTHH:mm */
  createdAt: string;
  /** 좋아요 수 (아래 likedBy 의 좋아요도 들어 있어요) */
  likes: number;
  /** 이 데모의 두 계정(학생 b2c · 기업 b2b) 중 좋아요를 누른 쪽 (DB 에서는 social_post_likes 의 행) */
  likedBy: Role[];
  /** 이 데모의 계정이 쓴 글 (학생 글은 me, 기업 글은 myCompanyId 의 글). 샘플로 들어 있는 다른 사람·다른 기업의 글은 false */
  mine: boolean;
}

/** F-503 학생 자랑 글: 닉네임·스킬 수만 보이고, 플랫폼에 기록된 실적 1건이 붙어요 */
export interface BragPost extends PostBase {
  kind: "brag";
  authorName: string;
  /** 글쓴이가 가진 스킬 수(#38 — 레벨 대신). 글을 올린 때의 값 */
  authorSkills: number;
  achievement: PostAchievement;
}

/** F-504 기업 홍보 글: 항상 "PR" 표시가 붙고, 우리 회사 챌린지를 연결하거나 공식 SNS 게시를 신청할 수 있어요 */
export interface PrPost extends PostBase {
  kind: "pr";
  companyId: string;
  title: Text;
  challengeId: string | null;
  official: OfficialShare | null;
}

export type SocialPost = BragPost | PrPost;

/** SDGs 인증마크 심사 항목 (certification.ts) */
export type CertCriterionId = "ecoPackage" | "renewable" | "donation" | "womenManagers" | "volunteer" | "disclosure";
export interface CertAnswer {
  value: number;
  /** 증빙 자료를 올렸는지 (올리지 않으면 점수에 넣지 않아요) */
  evidence: boolean;
}
export type CertAnswers = Record<CertCriterionId, CertAnswer>;

/**
 * 학생이 받은 돈의 기록(「受け取った賞金」) 항목 종류: prize = 기업이 최우수상 팀에 직접 지급한 상금, return = 흑자 뒤 운영사가 내는 학생 특별상(운영 환원).
 * 운영사는 돈을 맡지 않아서(2026-11-08 직접 지급 모델) 잔액·출금·본인 확인은 없어요 — 설계는 docs/fees.md, 규칙은 wallet.ts.
 * (DB 의 wallet_* 표는 이전 リワード残高 설계 그대로예요 — docs/rewards.md)
 */
export type WalletEntryKind = "prize" | "return";

/** 돈이 어디서 왔는지: 상금은 과제·기업·상(賞), 특별상은 회차 이름 */
export type WalletSource =
  | {
      kind: "prize";
      /** 상금을 건 과제. 앱을 쓰기 전의 샘플 실적(history)에서 받은 상금은 null */
      challengeId: string | null;
      /** 연결된 수상 실적(Activity)의 id */
      activityId: string | null;
      companyId: string;
      /** 내역에 보여 줄 과제 이름 (실적과 같은 사본) */
      title: Text;
      award: AwardKind;
    }
  | { kind: "return"; round: Text };

/** 받은 돈 한 줄. 금액은 언제나 양수(엔) */
export interface WalletEntry {
  id: string;
  studentId: string;
  kind: WalletEntryKind;
  amountYen: number;
  /** YYYY-MM-DD */
  date: string;
  source: WalletSource;
}

/** 학생 한 명이 받은 상금·특별상의 기록 */
export interface Wallet {
  /** 최신순이 아니어도 돼요 — 화면이 날짜순으로 정렬해요 */
  entries: WalletEntry[];
}

/**
 * 과제의 상금 지급 (과제당 1건). 상금은 기업이 최우수상 팀에 직접 지급하고, 운영사는 맡지 않아요(수수료만 따로 — fees.ts).
 * promised = 과제에 상금을 걸었어요(표창 전) · paid = 최우수상 팀에 지급했어요(데모는 표창할 때 기록) · noWinner = 최우수상 없이 끝나서 지급할 상금이 없어요.
 * 기업의 신뢰 실적(network.ts)에서 「약속대로 지급한 상금」으로 세요.
 */
export type PrizePaymentStatus = "promised" | "paid" | "noWinner";
export interface PrizePayment {
  challengeId: string;
  companyId: string;
  amountYen: number;
  status: PrizePaymentStatus;
  /** 상금을 건 날(과제를 낸 날) */
  promisedOn: string;
  /** 지급한 날 (paid 일 때만) */
  paidOn: string | null;
  /** 상금을 받은 기획서 (paid 일 때만, 데모 밖의 샘플 팀이면 null) */
  proposalId: string | null;
}

// ───────── 연구 의뢰 (대학원생 연구자) ─────────
// 흐름: ① 기업이 SDGs 과제와 상금을 내요 → ② 학생이 아이디어를 내고 심사·표창(채택)돼요 → ③ 기업이 그 아이디어를 실현하려고
// 「연구 의뢰」(두 번째 과제)를 의뢰비와 함께 내요 → ④ 대학원생 연구자가 맡아 연구하고 성과(보고서·데이터)를 기업에 보내요 → 기업이 확인하면 의뢰비를 받아요.
// 운영 수수료는 의뢰비의 10%(최저 ¥9,000)를 기업이 따로 내고, 연구자는 의뢰비를 전액 받아요(fees.ts, 2026-11-08).
// 시제품·제조·판로는 은행의 비즈니스 매칭 등이 맡아요(앱 밖).
// 웹 데모 전용이고 DB 표는 아직 없어요 — 설계와 열린 질문은 docs/research.md.

export const RESEARCH_FIELDS = ["environment", "materials", "food", "energy", "data", "social"] as const;
/** 연구 분야 (의뢰마다 1~3개, 연구자 프로필에도 써요) */
export type ResearchField = (typeof RESEARCH_FIELDS)[number];

/** open = 연구자를 찾는 중 · inProgress = 연구 중 · delivered = 성과가 도착해서 기업 확인 대기 · completed = 기업이 확인(의뢰비 지급) */
export type ResearchRequestStatus = "open" | "inProgress" | "delivered" | "completed";

/** 연구의 출발점이 된 학생 아이디어(표창·채택된 기획서). 기획서의 제목·팀 이름 사본을 들고 있어서, 데모 밖의 샘플 아이디어도 보여 줄 수 있어요 */
export interface ResearchOrigin {
  /** 데모 안의 기획서 id. 데모에 기획서가 없는 샘플은 null */
  proposalId: string | null;
  /** 아이디어가 나온 과제 (데모에 과제가 없는 샘플은 null) */
  challengeId: string | null;
  /** 학생이 쓴 글 그대로(한 가지 언어) */
  ideaTitle: string;
  teamName: string;
}

/** 연구자가 보낸 성과: 요약 + 파일 1개 (데모는 파일 이름·크기만 읽어요 — 내용은 읽거나 보내지 않아요) */
export interface ResearchResult {
  /** 연구자가 쓴 글 그대로(한 가지 언어) */
  summary: string;
  fileName: string;
  fileSizeBytes: number;
  /** 파일 지문 (데모에서는 의뢰 id·파일 이름·크기·요약으로 만든 SHA-256 — research.ts 의 resultFingerprint) */
  sha256: string;
  /** YYYY-MM-DDTHH:mm */
  submittedAt: string;
}

/** 연구 의뢰 1건. 의뢰비(feeYen)는 기업이 정하고, 성과를 확인한 뒤 기업이 연구자에게 직접 지급해요(데모는 기록만) */
export interface ResearchRequest {
  id: string;
  companyId: string;
  origin: ResearchOrigin;
  title: Text;
  /** 연구해 주었으면 하는 것 */
  detail: Text;
  /** 받고 싶은 성과물 (예: 보고서 PDF와 데이터) */
  deliverable: Text;
  fields: ResearchField[];
  feeYen: number;
  /** YYYY-MM-DD */
  postedOn: string;
  /** 성과를 보내는 기한 (YYYY-MM-DD) */
  dueOn: string;
  status: ResearchRequestStatus;
  /** 맡은 연구자 (open 이면 null) */
  researcherId: string | null;
  acceptedOn: string | null;
  /** delivered · completed 일 때만 */
  result: ResearchResult | null;
  /** completed 일 때만 — 기업이 성과를 확인하고 의뢰비를 지급한 날 */
  completedOn: string | null;
}

/** 데모의 연구자 계정(대학원생). 소속은 가상의 샘플이에요 */
export interface ResearcherProfile {
  id: string;
  /** 닉네임 (학생 프로필과 같이 실명이 아니에요) */
  name: string;
  affiliation: Text;
  degree: "master" | "doctor";
  /** 학년 (석사 1~2, 박사 1~3) */
  year: number;
  fields: ResearchField[];
  bio: Text;
}

// ───────── 기업 네트워크 (신뢰를 쌓은 기업끼리의 업무 의뢰 · 상호 평가) ─────────
// 이 플랫폼에서 약속대로 돈을 낸 거래(상금 · 연구 의뢰비 · 업무 의뢰비)와 거래 상대의 평가가 쌓이면 「신뢰 기업」이 되고(network.ts 의 TRUST_RULE),
// 신뢰 기업끼리는 시제품·제조·물류 같은 업무를 지명하거나 공개 모집해서 의뢰할 수 있어요. 수수료는 없어요(신뢰 기업의 특전 — fees.ts).
// 의뢰비는 의뢰한 기업이 맡은 기업에 직접 지급해요(데모는 기록만). 웹 데모 전용이고 DB 표는 아직 없어요 — 설계는 docs/network.md.

export const WORK_CATEGORIES = ["prototype", "manufacturing", "materials", "logistics", "sales", "design", "research", "other"] as const;
/** 업무 분야: 시제품 · 제조·가공 · 소재·자재 · 물류·보관 · 판로·판매 · 디자인·홍보 · 조사·분석 · 그 밖 */
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

/** direct = 신뢰 기업 목록에서 골라 그 기업에 직접(지명) · open = 신뢰 기업 모두에게 공개 모집 */
export type WorkMode = "direct" | "open";
/**
 * open = 공개 모집 중 · requested = 지명 의뢰를 상대가 확인 중 · inProgress = 진행 중 · delivered = 맡은 기업이 납품을 알렸어요(의뢰한 기업의 확인 대기)
 * · completed = 의뢰한 기업이 확인하고 의뢰비를 지급했어요 · declined = 지명받은 기업이 거절했어요
 */
export type WorkStatus = "open" | "requested" | "inProgress" | "delivered" | "completed" | "declined";

/** 공개 모집에 응모한 기업과 한 줄 */
export interface WorkApplication {
  companyId: string;
  message: Text;
  /** YYYY-MM-DD */
  appliedOn: string;
}

/** 기업 간 업무 의뢰 1건 */
export interface WorkRequest {
  id: string;
  mode: WorkMode;
  /** 의뢰한 기업 */
  fromCompanyId: string;
  /** 맡은(지명된) 기업 — 공개 모집에서 아직 고르지 않았으면 null */
  toCompanyId: string | null;
  category: WorkCategory;
  title: Text;
  detail: Text;
  /** 의뢰비(엔) — 맡은 기업에 직접 지급해요 */
  budgetYen: number;
  postedOn: string;
  /** 납기 (YYYY-MM-DD) */
  dueOn: string;
  status: WorkStatus;
  applications: WorkApplication[];
  /** 맡기로 한 날 (진행 중부터) */
  acceptedOn: string | null;
  /** 납품을 알린 날과 한 줄 (확인 대기부터) */
  deliveredOn: string | null;
  deliveryNote: Text | null;
  /** 의뢰한 기업이 확인하고 의뢰비를 지급한 날 (완료) */
  completedOn: string | null;
}

/** 평가가 붙는 거래: prize = 받은 상금(학생 → 기업) · research = 연구 의뢰(연구자 ↔ 기업) · work = 기업 간 업무 의뢰(기업 ↔ 기업) */
export type RatingKind = "prize" | "research" | "work";
export type RaterRole = "student" | "researcher" | "company";

/** 상호 평가 1건: 거래가 끝나면 서로 별점(1~5)과 한 줄을 남겨요. 기업이 받은 평가가 신뢰 실적이 돼요 */
export interface Rating {
  id: string;
  kind: RatingKind;
  /** 과제 id(상금 — 과제가 없는 지난 실적은 활동 id) · 연구 의뢰 id · 업무 의뢰 id */
  refId: string;
  fromRole: RaterRole;
  /** 평가한 사람·기업의 id (샘플의 다른 학생은 샘플 id) */
  fromId: string;
  toRole: "company" | "researcher";
  toId: string;
  /** 1~5 */
  stars: number;
  comment: Text;
  /** YYYY-MM-DD */
  createdOn: string;
}

/** 앱 하나가 들고 있는 데모 상태 전체 (state.ts 의 reducer 가 바꿔요) */
export interface DemoState {
  version: 1;
  /** 오늘 날짜(기준일). 저장된 상태를 다른 날 열면 날짜를 그만큼 옮겨서 D-day 가 항상 자연스럽게 (rebase) */
  today: string;
  /** 새 id 를 만들 때 쓰는 번호 */
  seq: number;
  me: StudentProfile;
  myCompanyId: string;
  companies: Company[];
  challenges: Challenge[];
  teamPosts: TeamPost[];
  bookmarks: string[];
  proposals: Proposal[];
  /** 앱을 쓰기 전의 활동 기록(샘플) */
  history: Activity[];
  /** 이 데모의 학생(me)이 가진 스킬 — 수상하면 하나씩 늘어요(#38). 화면에서는 최근 것부터 */
  skills: HeroSkill[];
  /** 내가 카드뉴스를 공유·저장한 횟수 */
  shares: number;
  talent: Candidate[];
  scouts: Scout[];
  matches: Match[];
  /** F-503·F-504 SNS 피드의 글 (내가 올린 글을 맨 앞에 더해요. 화면에서는 최신순으로 정렬해요) */
  posts: SocialPost[];
  cert: CertAnswers;
  esgGeneratedOn: string | null;
  /** 이 데모의 학생(me)이 받은 상금·특별상의 기록 */
  wallet: Wallet;
  /** 과제마다 건 상금과 그 지급 (기업이 학생에게 직접 지급) */
  prizePayments: PrizePayment[];
  /** 이 데모의 연구자 계정 (역할 researcher) */
  researcher: ResearcherProfile;
  /** 연구 의뢰 (우리 회사가 낸 것 + 다른 회사의 샘플). 화면에서는 날짜순으로 정렬해요 */
  researchRequests: ResearchRequest[];
  /** 기업 간 업무 의뢰 (우리 회사가 내거나 받은 것 + 다른 회사끼리의 샘플) */
  workRequests: WorkRequest[];
  /** 상호 평가 (학생·연구자·기업이 남긴 것 + 샘플) */
  ratings: Rating[];
}

export type { LocalizedText };
