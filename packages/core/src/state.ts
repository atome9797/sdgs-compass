// 데모 상태와 그것을 바꾸는 reducer (순수 함수). 화면은 dispatch(action) 만 하고, 계산·검사는 모두 여기와 core 의 다른 모듈이 해요.
// 시각은 모두 action 의 at("YYYY-MM-DDTHH:mm")로 받아서 reducer 가 항상 같은 입력에 같은 결과를 내요(테스트하기 쉬워요).
import { deriveActivities } from "./activities";
import { buildChallenge, validateChallengeDraft, type ChallengeDraft } from "./challenge";
import { clampCertValue } from "./certification";
import type { AwardKind, CertCriterionId, DemoState, Match, Proposal, Review, Scout, ScoutKind, SkillId, TeamPost } from "./domain";
import { addDays, daysBetween } from "./format";
import { levelOf } from "./impact";
import { splitMatchFee } from "./fees";
import { fileFingerprint, makeReceiptNo, validateProposalDraft, type ProposalDraft } from "./proposal";
import { canSendScout } from "./scout";
import { isOpenFor } from "./recommend";

/** 기업이 채택해서 매칭이 성립했을 때 수수료의 50%를 기부하는 곳(샘플) */
export const DONATION_RECIPIENT = { ja: "海の環境保全団体（サンプル）", ko: "해양 환경 보전 단체(샘플)" } as const;

export type Action =
  | { type: "hydrate"; state: DemoState }
  | { type: "reset"; state: DemoState }
  | { type: "toggleBookmark"; challengeId: string }
  | { type: "addTeamPost"; challengeId: string; title: string; body: string; rolesWanted: SkillId[]; at: string }
  | { type: "requestTeam"; postId: string }
  | { type: "submitProposal"; challengeId: string; draft: ProposalDraft; at: string }
  | { type: "createChallenge"; draft: ChallengeDraft }
  | { type: "reviewProposal"; proposalId: string; review: Omit<Review, "reviewedAt">; at: string }
  | { type: "awardProposal"; proposalId: string; award: AwardKind }
  | { type: "adoptProposal"; proposalId: string; at: string }
  | { type: "sendScout"; candidateId: string; kind: ScoutKind; message: string; at: string }
  | { type: "respondScout"; scoutId: string; response: "accepted" | "declined" }
  | { type: "markScoutRead"; scoutId: string }
  | { type: "recordShare" }
  | { type: "setCertAnswer"; id: CertCriterionId; value?: number; evidence?: boolean }
  | { type: "generateEsg"; at: string };

const clampScore = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

function myPoints(state: DemoState): number {
  return deriveActivities(state).reduce((sum, a) => sum + a.points, 0);
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "hydrate":
    case "reset":
      return action.state;

    case "toggleBookmark": {
      if (!state.challenges.some((c) => c.id === action.challengeId)) return state;
      const has = state.bookmarks.includes(action.challengeId);
      return { ...state, bookmarks: has ? state.bookmarks.filter((id) => id !== action.challengeId) : [...state.bookmarks, action.challengeId] };
    }

    case "addTeamPost": {
      const title = action.title.trim();
      if (title === "" || !state.challenges.some((c) => c.id === action.challengeId)) return state;
      const challenge = state.challenges.find((c) => c.id === action.challengeId);
      const post: TeamPost = {
        id: `tp${state.seq}`,
        challengeId: action.challengeId,
        authorName: state.me.nickname,
        authorLevel: levelOf(myPoints(state)),
        title,
        body: action.body.trim(),
        rolesWanted: action.rolesWanted,
        sdgIds: challenge ? challenge.sdgIds : [],
        createdOn: action.at.slice(0, 10),
        requests: 0,
        mine: true,
        requestedByMe: false,
      };
      return { ...state, seq: state.seq + 1, teamPosts: [post, ...state.teamPosts] };
    }

    case "requestTeam": {
      const post = state.teamPosts.find((p) => p.id === action.postId);
      if (!post || post.mine || post.requestedByMe) return state;
      return { ...state, teamPosts: state.teamPosts.map((p) => (p.id === post.id ? { ...p, requestedByMe: true, requests: p.requests + 1 } : p)) };
    }

    case "submitProposal": {
      const challenge = state.challenges.find((c) => c.id === action.challengeId);
      if (!challenge || !isOpenFor(challenge, state.today)) return state;
      if (validateProposalDraft(action.draft, challenge.closesOn, state.today).length > 0) return state;
      const existing = state.proposals.find((p) => p.challengeId === challenge.id && p.mine);
      const version = (existing ? existing.versions.length : 0) + 1;
      const draft = action.draft;
      const entry = {
        no: version,
        fileName: draft.fileName ?? "",
        fileSizeBytes: draft.fileSizeBytes,
        submittedAt: action.at,
        sha256: fileFingerprint(draft, version),
      };
      if (existing) {
        const updated: Proposal = {
          ...existing,
          teamName: draft.teamName.trim(),
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          videoUrl: draft.videoUrl.trim(),
          versions: [...existing.versions, entry],
        };
        return { ...state, proposals: state.proposals.map((p) => (p.id === existing.id ? updated : p)) };
      }
      const proposal: Proposal = {
        id: `pr${state.seq}`,
        challengeId: challenge.id,
        mine: true,
        teamName: draft.teamName.trim(),
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        videoUrl: draft.videoUrl.trim(),
        versions: [entry],
        receiptNo: makeReceiptNo(action.at, state.seq),
        submittedAt: action.at,
        status: "submitted",
        review: null,
        award: null,
      };
      return {
        ...state,
        seq: state.seq + 1,
        proposals: [...state.proposals, proposal],
        challenges: state.challenges.map((c) => (c.id === challenge.id ? { ...c, applicants: c.applicants + 1 } : c)),
      };
    }

    case "createChallenge": {
      if (validateChallengeDraft(action.draft).length > 0) return state;
      const challenge = buildChallenge(action.draft, { id: `ch${state.seq}`, companyId: state.myCompanyId, today: state.today, hue: (state.seq * 47) % 360 });
      return { ...state, seq: state.seq + 1, challenges: [challenge, ...state.challenges] };
    }

    case "reviewProposal": {
      const proposal = state.proposals.find((p) => p.id === action.proposalId);
      if (!proposal) return state;
      const review: Review = {
        creativity: clampScore(action.review.creativity),
        feasibility: clampScore(action.review.feasibility),
        sdgContribution: clampScore(action.review.sdgContribution),
        comment: action.review.comment.trim(),
        reviewedAt: action.at,
      };
      const status = proposal.status === "submitted" ? "reviewed" : proposal.status;
      return { ...state, proposals: state.proposals.map((p) => (p.id === proposal.id ? { ...p, review, status } : p)) };
    }

    case "awardProposal": {
      const proposal = state.proposals.find((p) => p.id === action.proposalId);
      if (!proposal || proposal.status === "adopted") return state;
      return { ...state, proposals: state.proposals.map((p) => (p.id === proposal.id ? { ...p, award: action.award, status: "awarded" } : p)) };
    }

    case "adoptProposal": {
      const proposal = state.proposals.find((p) => p.id === action.proposalId);
      const challenge = proposal ? state.challenges.find((c) => c.id === proposal.challengeId) : undefined;
      if (!proposal || !challenge || proposal.status === "adopted") return state;
      const split = splitMatchFee();
      const match: Match = {
        id: `m${state.seq}`,
        challengeId: challenge.id,
        proposalId: proposal.id,
        companyId: challenge.companyId,
        feeYen: split.feeYen,
        donationYen: split.donationYen,
        matchedOn: action.at.slice(0, 10),
        recipient: DONATION_RECIPIENT,
      };
      return {
        ...state,
        seq: state.seq + 1,
        matches: [...state.matches, match],
        proposals: state.proposals.map((p) => (p.id === proposal.id ? { ...p, status: "adopted" } : p)),
      };
    }

    case "sendScout": {
      const message = action.message.trim();
      const isMe = action.candidateId === state.me.id;
      const candidate = isMe ? state.me : state.talent.find((c) => c.id === action.candidateId);
      if (!candidate || !candidate.scoutable || message === "") return state;
      if (!canSendScout(state.scouts, state.myCompanyId, candidate.id, state.today)) return state;
      const scout: Scout = {
        id: `sc${state.seq}`,
        companyId: state.myCompanyId,
        studentId: candidate.id,
        kind: action.kind,
        message,
        sentAt: action.at,
        status: "sent",
      };
      return { ...state, seq: state.seq + 1, scouts: [scout, ...state.scouts] };
    }

    case "respondScout": {
      const scout = state.scouts.find((s) => s.id === action.scoutId && s.studentId === state.me.id);
      if (!scout) return state;
      return { ...state, scouts: state.scouts.map((s) => (s.id === scout.id ? { ...s, status: action.response } : s)) };
    }

    case "markScoutRead": {
      const scout = state.scouts.find((s) => s.id === action.scoutId);
      if (!scout || scout.status !== "sent") return state;
      return { ...state, scouts: state.scouts.map((s) => (s.id === scout.id ? { ...s, status: "read" } : s)) };
    }

    case "recordShare":
      return { ...state, shares: state.shares + 1 };

    case "setCertAnswer": {
      const current = state.cert[action.id];
      const next = {
        value: action.value === undefined ? current.value : clampCertValue(action.id, action.value),
        evidence: action.evidence === undefined ? current.evidence : action.evidence,
      };
      return { ...state, cert: { ...state.cert, [action.id]: next } };
    }

    case "generateEsg":
      return { ...state, esgGeneratedOn: action.at.slice(0, 10) };
  }
}

// ───────── 기준일 옮기기 (rebase) ─────────

/** "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm" 의 날짜 부분을 days 일 옮겨요 */
function shift(iso: string, days: number): string {
  return `${addDays(iso.slice(0, 10), days)}${iso.slice(10)}`;
}

/**
 * 저장해 둔 상태를 다른 날 열었을 때, 모든 날짜를 같은 날수만큼 옮겨서 마감까지 남은 날(D-day)이 그대로 유지돼요.
 * (데모가 시간이 지나도 "모두 마감"으로 보이지 않게 하려는 것이고, 실서비스에서는 쓰지 않아요.)
 */
export function rebaseState(state: DemoState, today: string): DemoState {
  const delta = daysBetween(state.today, today);
  if (delta === 0) return state;
  return {
    ...state,
    today,
    challenges: state.challenges.map((c) => ({ ...c, opensOn: shift(c.opensOn, delta), closesOn: shift(c.closesOn, delta) })),
    teamPosts: state.teamPosts.map((p) => ({ ...p, createdOn: shift(p.createdOn, delta) })),
    proposals: state.proposals.map((p) => ({
      ...p,
      submittedAt: shift(p.submittedAt, delta),
      versions: p.versions.map((v) => ({ ...v, submittedAt: shift(v.submittedAt, delta) })),
      review: p.review ? { ...p.review, reviewedAt: shift(p.review.reviewedAt, delta) } : null,
    })),
    history: state.history.map((a) => ({ ...a, date: shift(a.date, delta) })),
    scouts: state.scouts.map((s) => ({ ...s, sentAt: shift(s.sentAt, delta) })),
    matches: state.matches.map((m) => ({ ...m, matchedOn: shift(m.matchedOn, delta) })),
    esgGeneratedOn: state.esgGeneratedOn ? shift(state.esgGeneratedOn, delta) : null,
  };
}
