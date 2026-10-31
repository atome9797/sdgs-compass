// 도메인 타입. db/schema.sql(PostgreSQL)의 테이블과 대응해요 — README 의 ERD 참고.
// 데모는 이 타입의 샘플 데이터(packages/data/src/seed.ts)로 동작하고, 실서비스에서는 같은 모양을 서버 API 가 돌려줘요.
import type { LocalizedText, Text } from "./i18n";
import type { SdgId } from "./sdg";

/** 사용자 역할 (기능명세 3장: B2C 일반회원 / B2B 기업·기관 / Admin 은 데모 범위 밖) */
export type Role = "b2c" | "b2b";

export const SKILL_IDS = ["design", "marketing", "programming", "data", "research", "writing", "video", "planning", "languages", "finance"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export type ChallengeStatus = "open" | "judging" | "closed";
export type Participation = "individual" | "team" | "both";
export type RewardKind = "prize" | "internship" | "offer";

export interface Company {
  id: string;
  name: Text;
  industry: Text;
  region: Text;
  about: Text;
  sdgIds: SdgId[];
  verified: boolean;
  /** 데모용 로고 대신 쓰는 이모지와 배경색 */
  emoji: string;
  accent: string;
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
  authorLevel: number;
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

/** 매칭 성립 1건: 중개 수수료와 그 중 기부 (fees.ts) */
export interface Match {
  id: string;
  challengeId: string;
  proposalId: string;
  companyId: string;
  feeYen: number;
  donationYen: number;
  matchedOn: string;
  /** 기업 이름으로 기부한 곳 */
  recipient: Text;
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
 * 기업 홍보 글의 공식 SNS 게시 신청. 같은 채널의 같은 날짜에는 한 회사만 가능하고(채널이 다르면 같은 날도 돼요),
 * 데모에는 관리자 화면이 없어서 상태는 "예정"뿐이에요
 */
export interface OfficialShare {
  /** 게시 예정일 (YYYY-MM-DD) */
  on: string;
  /** 게시할 공식 SNS. 채널을 고르기 전에 저장된 옛 데모 상태에는 없어서, 불러올 때 instagram 으로 채워요 (storage.ts) */
  channel: OfficialChannel;
  feeYen: number;
  status: "scheduled";
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

/** F-503 학생 자랑 글: 닉네임·레벨만 보이고, 플랫폼에 기록된 실적 1건이 붙어요 */
export interface BragPost extends PostBase {
  kind: "brag";
  authorName: string;
  authorLevel: number;
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
 * #25 リワード残高(데모)의 원장 항목 종류: prize = 기업 상금 입금, return = 운영 환원 입금, withdrawal = 은행 계좌로 출금.
 * 운영사가 第二種資金移動業 등록을 받은 뒤에 제공할 기능이에요(설계는 docs/rewards.md, 규칙은 wallet.ts, DB 는 wallet_entries).
 */
export type WalletEntryKind = "prize" | "return" | "withdrawal";
/** 입금(prize·return)은 바로 completed. 출금은 신청하면 requested — 데모는 실제로 보내지 않아서 그대로 머물러요 */
export type WalletEntryStatus = "completed" | "requested";

/** 돈이 어디서 왔는지: 상금은 과제·기업·상(賞), 환원은 회차 이름. 출금에는 없어요(null) */
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

/** 원장 한 줄. 금액은 언제나 양수(엔)이고, 잔액 = 입금(prize·return) − 출금(withdrawal) */
export interface WalletEntry {
  id: string;
  studentId: string;
  kind: WalletEntryKind;
  amountYen: number;
  /** YYYY-MM-DD */
  date: string;
  source: WalletSource | null;
  status: WalletEntryStatus;
}

/** 학생 한 명의 リワード残高. 본인 확인(eKYC)은 데모에서 버튼 하나로 완료돼요(실제 확인은 하지 않아요) */
export interface Wallet {
  kyc: "none" | "verified";
  /** 본인 확인을 마친 날 (YYYY-MM-DD) */
  kycVerifiedOn: string | null;
  /** 최신순이 아니어도 돼요 — 화면이 날짜순으로 정렬해요 */
  entries: WalletEntry[];
}

/** 과제를 낼 때 기업이 운영사에 맡긴 상금 (과제당 1건). 최우수상이 정해지면 그 팀에 송금(paid), 수상 없이 끝나면 기업에 반환(refunded) */
export type PrizeDepositStatus = "deposited" | "paid" | "refunded";
export interface PrizeDeposit {
  challengeId: string;
  companyId: string;
  amountYen: number;
  status: PrizeDepositStatus;
  depositedOn: string;
  /** 송금하거나 반환한 날 (deposited 이면 null) */
  settledOn: string | null;
  /** 상금을 받은 기획서 (paid 일 때만) */
  proposalId: string | null;
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
  /** 내가 카드뉴스를 공유·저장한 횟수 */
  shares: number;
  talent: Candidate[];
  scouts: Scout[];
  matches: Match[];
  /** F-503·F-504 SNS 피드의 글 (내가 올린 글을 맨 앞에 더해요. 화면에서는 최신순으로 정렬해요) */
  posts: SocialPost[];
  cert: CertAnswers;
  esgGeneratedOn: string | null;
  /** #25 이 데모의 학생(me)의 リワード残高 (데모) */
  wallet: Wallet;
  /** #25 과제마다 기업이 맡긴 상금 (데모) */
  prizeDeposits: PrizeDeposit[];
}

export type { LocalizedText };
