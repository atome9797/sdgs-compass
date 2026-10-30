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

/** SDGs 인증마크 심사 항목 (certification.ts) */
export type CertCriterionId = "ecoPackage" | "renewable" | "donation" | "womenManagers" | "volunteer" | "disclosure";
export interface CertAnswer {
  value: number;
  /** 증빙 자료를 올렸는지 (올리지 않으면 점수에 넣지 않아요) */
  evidence: boolean;
}
export type CertAnswers = Record<CertCriterionId, CertAnswer>;

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
  cert: CertAnswers;
  esgGeneratedOn: string | null;
}

export type { LocalizedText };
