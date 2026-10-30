// 운영자 화면 시험용 데모 상태: 숫자를 손으로 셀 수 있을 만큼 작게 만들어서, 집계가 맞는지 값으로 못 박아요.
// (진짜 샘플은 @sdgs-compass/data 에 있어요 — core 는 data 를 가져올 수 없어서 따로 만들었어요.)
import type { Activity, BragPost, Candidate, CertAnswers, Company, DemoState, Match, OfficialShare, PrPost, Proposal, Scout, TeamPost } from "./domain";
import { makeChallenge, makeProfile } from "./testing/fixtures";

const company = (id: string, verified: boolean): Company => ({
  id,
  name: { ja: `会社${id}`, ko: `회사${id}` },
  industry: "サンプル",
  region: "東京",
  about: "",
  sdgIds: [14],
  verified,
  emoji: "🌊",
  accent: "#0A97D9",
});

const candidate = (id: string, scoutable: boolean, sdgInterests: Candidate["sdgInterests"]): Candidate => ({
  id,
  nickname: `student-${id}`,
  university: "Test University",
  faculty: "Test Faculty",
  skills: ["design"],
  sdgInterests,
  points: 100,
  awards: 0,
  scoutable,
  bio: "",
});

const proposal = (id: string, challengeId: string, status: Proposal["status"], submittedAt: string, extra: Partial<Proposal> = {}): Proposal => ({
  id,
  challengeId,
  mine: false,
  teamName: `team-${id}`,
  title: `企画 ${id}`,
  summary: "概要",
  videoUrl: "",
  versions: [{ no: 1, fileName: `${id}.pdf`, fileSizeBytes: 1000, submittedAt, sha256: "0".repeat(64) }],
  receiptNo: `SC-20261029-${id}`,
  submittedAt,
  status,
  review: null,
  award: null,
  ...extra,
});

const scout = (id: string, status: Scout["status"], sentAt: string): Scout => ({
  id,
  companyId: "co1",
  studentId: "s1",
  kind: "internship",
  message: { ja: "よろしく", ko: "잘 부탁해요" },
  sentAt,
  status,
});

const match = (id: string, matchedOn: string): Match => ({
  id,
  challengeId: "chA",
  proposalId: "p5",
  companyId: "co1",
  feeYen: 30_000,
  donationYen: 15_000,
  matchedOn,
  recipient: { ja: "団体", ko: "단체" },
});

const teamPost = (id: string, createdOn: string): TeamPost => ({
  id,
  challengeId: "chA",
  authorName: "writer",
  authorLevel: 1,
  title: "仲間募集",
  body: "",
  rolesWanted: ["design"],
  sdgIds: [14],
  createdOn,
  requests: 0,
  mine: false,
  requestedByMe: false,
});

const activity = (id: string, kind: Activity["kind"], date: string, extra: Partial<Activity> = {}): Activity => ({
  id,
  kind,
  title: { ja: `活動${id}`, ko: `활동${id}` },
  companyName: { ja: "会社", ko: "회사" },
  sdgIds: [14],
  date,
  points: 100,
  ...extra,
});

const brag = (id: string, createdAt: string, likes: number): BragPost => ({
  id,
  kind: "brag",
  body: "自慢",
  sdgIds: [14],
  createdAt,
  likes,
  likedBy: [],
  mine: false,
  authorName: "writer",
  authorLevel: 2,
  achievement: { activityId: null, kind: "submission", title: { ja: "実績", ko: "실적" }, companyName: { ja: "会社", ko: "회사" }, award: null, sdgIds: [14] },
});

const pr = (id: string, createdAt: string, likes: number, official: OfficialShare | null): PrPost => ({
  id,
  kind: "pr",
  body: "PR",
  sdgIds: [14],
  createdAt,
  likes,
  likedBy: [],
  mine: false,
  companyId: "co1",
  title: { ja: "PR", ko: "홍보" },
  challengeId: null,
  official,
});

const CERT: CertAnswers = {
  ecoPackage: { value: 0, evidence: false },
  renewable: { value: 0, evidence: false },
  donation: { value: 0, evidence: false },
  womenManagers: { value: 0, evidence: false },
  volunteer: { value: 0, evidence: false },
  disclosure: { value: 0, evidence: false },
};

/** 공식 SNS 게시 신청 1건 (X) */
const OFFICIAL: OfficialShare = { on: "2026-10-31", channel: "x", feeYen: 3000, status: "scheduled" };

/**
 * 기준일 2026-10-30. 값(손으로 센 것):
 * 학생 4(나 + 3) · 스카우트 가능 3 / 기업 2(인증 1) / 챌린지 5 = 모집 2 · 심사 1 · 마감 2, 응모자 25 /
 * 기획서 5 = 제출 2 · 심사 완료 1 · 수상 1 · 채택 1 / 수상 2(기획서 1 + 활동 기록 1) / 증명서 4(활동 기록 3 + 내 기획서 1) /
 * 스카우트 3(보냄 1 · 읽음 1 · 수락 1) / 매칭 2(수수료 60,000 · 기부 30,000) / 팀원 모집 2 / 피드 글 4(자랑 2 · 홍보 2), 좋아요 20, 공식 게시 신청 1
 */
export function makeUsageState(overrides: Partial<DemoState> = {}): DemoState {
  return {
    version: 1,
    today: "2026-10-30",
    seq: 100,
    me: makeProfile({ id: "me", scoutable: true, sdgInterests: [14, 12] }),
    myCompanyId: "co1",
    companies: [company("co1", true), company("co2", false)],
    challenges: [
      makeChallenge({ id: "chA", companyId: "co1", status: "open", applicants: 10, sdgIds: [14, 12], closesOn: "2026-11-10" }),
      makeChallenge({ id: "chB", companyId: "co2", status: "open", applicants: 5, sdgIds: [14], closesOn: "2026-11-05" }),
      makeChallenge({ id: "chC", companyId: "co1", status: "judging", applicants: 3, sdgIds: [12], closesOn: "2026-10-20" }),
      makeChallenge({ id: "chD", companyId: "co1", status: "closed", applicants: 7, sdgIds: [4], closesOn: "2026-09-30" }),
      makeChallenge({ id: "chE", companyId: "co2", status: "closed", applicants: 0, sdgIds: [17], closesOn: "2026-10-05" }),
    ],
    teamPosts: [teamPost("tp1", "2026-10-28"), teamPost("tp2", "2026-10-30")],
    bookmarks: [],
    proposals: [
      proposal("p1", "chA", "submitted", "2026-10-29T10:00"),
      proposal("p2", "chA", "submitted", "2026-10-29T18:30"),
      proposal("p3", "chC", "reviewed", "2026-10-12T09:00", { mine: true }),
      proposal("p4", "chD", "awarded", "2026-09-20T12:00", { award: "excellence" }),
      proposal("p5", "chD", "adopted", "2026-09-25T12:00"),
    ],
    history: [
      activity("h1", "participation", "2026-08-10"),
      activity("h2", "submission", "2026-10-05"),
      activity("h3", "award", "2026-10-06", { award: "excellence" }),
    ],
    shares: 0,
    talent: [candidate("a", true, [14]), candidate("b", false, [4, 14]), candidate("c", true, [12])],
    scouts: [scout("sc1", "sent", "2026-10-29T10:00"), scout("sc2", "read", "2026-10-25T10:00"), scout("sc3", "accepted", "2026-10-02T10:00")],
    matches: [match("m1", "2026-09-02"), match("m2", "2026-10-28")],
    posts: [
      pr("po1", "2026-10-30T09:00", 10, OFFICIAL),
      brag("po2", "2026-10-29T12:00", 5),
      pr("po3", "2026-10-27T08:00", 3, null),
      brag("po4", "2026-10-20T08:00", 2),
    ],
    cert: CERT,
    esgGeneratedOn: null,
    ...overrides,
  };
}
