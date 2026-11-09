// 데모 상태와 그것을 바꾸는 reducer (순수 함수). 화면은 dispatch(action) 만 하고, 계산·검사는 모두 여기와 core 의 다른 모듈이 해요.
// 시각은 모두 action 의 at("YYYY-MM-DDTHH:mm")로 받아서 reducer 가 항상 같은 입력에 같은 결과를 내요(테스트하기 쉬워요).
import { deriveActivities, showableActivities } from "./activities";
import { buildChallenge, validateChallengeDraft, type ChallengeDraft } from "./challenge";
import { clampCertValue } from "./certification";
import type { AwardKind, BragPost, CertCriterionId, DemoState, Match, PrPost, Proposal, RaterRole, Review, Role, Scout, ScoutKind, SkillId, TeamPost } from "./domain";
import { addDays, daysBetween } from "./format";
import { levelOf } from "./impact";
import { applyWorkRequest, chooseWorkApplicant, completeWork, deliverWork, postWorkRequest, rate, respondWorkRequest, type RatingDraft, type WorkDraft } from "./network";
import { authorRole, DEFAULT_OFFICIAL_CHANNEL, OFFICIAL_SHARE_FEE_YEN, POST_LIMITS, postContext, resolveOfficialDate, uniqueSdgs, validatePostDraft, type PostDraft } from "./post";
import { fileFingerprint, makeReceiptNo, teamOf, validateProposalDraft, type ProposalDraft } from "./proposal";
import { canSendScout } from "./scout";
import { isOpenFor } from "./recommend";
import { acceptResearchRequest, completeResearchRequest, postResearchRequest, submitResearchResult, type ResearchDraft, type ResearchResultDraft } from "./research";
import { payPrize, promisePrize } from "./wallet";

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
  /** 학생 설정: 기업의 스카우트를 받을지(= 기업의 인재 검색에 보일지). 포인트·레벨과는 관계없고, 이미 받은 스카우트는 그대로 둬요 */
  | { type: "setScoutable"; scoutable: boolean }
  /** F-503·F-504: 학생 자랑 글(kind brag) 또는 우리 회사 홍보 글(kind pr)을 올려요. 입력 검사(validatePostDraft)를 통과하지 못하면 아무것도 바뀌지 않아요 */
  | { type: "createPost"; draft: PostDraft; at: string }
  /** role = 지금 화면의 계정. 자기가 쓴 글에는 좋아요를 누를 수 없고, 학생·기업 계정이 따로 눌러요 */
  | { type: "togglePostLike"; postId: string; role: Role }
  /** 내 글만 지울 수 있어요 (자랑 글은 학생 계정, 홍보 글은 기업 계정에서) */
  | { type: "deletePost"; postId: string; role: Role }
  | { type: "setCertAnswer"; id: CertCriterionId; value?: number; evidence?: boolean }
  | { type: "generateEsg"; at: string }
  /** 연구 의뢰(research.ts): 우리 회사가 표창·채택한 아이디어를 실현하려고 의뢰비를 정해 게재해요. 입력 검사를 통과하지 못하면 그대로 */
  | { type: "postResearchRequest"; draft: ResearchDraft; at: string }
  /** 연구자 계정이 모집 중인 의뢰를 맡아요 (데모: 누르면 바로 담당) */
  | { type: "acceptResearchRequest"; requestId: string; at: string }
  /** 맡은 연구자가 성과(요약 + 파일)를 보내요 */
  | { type: "submitResearchResult"; requestId: string; draft: ResearchResultDraft; at: string }
  /** 의뢰한 기업이 성과를 확인하고 완료로 — 의뢰비는 기업이 연구자에게 직접 지급(데모는 기록만) */
  | { type: "completeResearchRequest"; requestId: string; at: string }
  /** 기업 네트워크(network.ts): 신뢰 기업인 우리 회사가 업무를 지명 의뢰하거나 공개 모집해요. 입력 검사를 통과하지 못하면 그대로 */
  | { type: "postWorkRequest"; draft: WorkDraft; at: string }
  /** 우리 회사가 지명받은 의뢰를 맡거나(accept) 거절해요 */
  | { type: "respondWorkRequest"; requestId: string; accept: boolean; at: string }
  /** 다른 기업의 공개 모집에 한 줄로 응모해요 */
  | { type: "applyWorkRequest"; requestId: string; message: string; at: string }
  /** 우리 회사의 공개 모집에 응모한 기업 한 곳에 맡겨요 */
  | { type: "chooseWorkApplicant"; requestId: string; companyId: string; at: string }
  /** 우리 회사가 맡은 의뢰의 납품을 알려요 */
  | { type: "deliverWork"; requestId: string; note: string; at: string }
  /** 우리 회사가 의뢰한 일의 납품을 확인하고 끝내요 — 의뢰비는 직접 지급(데모는 기록만) */
  | { type: "completeWork"; requestId: string; at: string }
  /** 끝난 거래의 상대를 평가해요 (role = 지금 화면의 계정: 학생 · 연구자 · 기업) */
  | { type: "rate"; role: RaterRole; draft: RatingDraft; at: string };

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
          ...teamOf(draft),
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
        ...teamOf(draft),
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
      // 상금은 과제에 걸어 두고(돈은 오가지 않아요), 최우수상이 정해지면 기업이 그 팀에 직접 지급해요
      const promise = promisePrize(challenge, state.today);
      return { ...state, seq: state.seq + 1, challenges: [challenge, ...state.challenges], prizePayments: promise ? [...state.prizePayments, promise] : state.prizePayments };
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
      const awarded = { ...state, proposals: state.proposals.map((p) => (p.id === proposal.id ? { ...p, award: action.award, status: "awarded" as const } : p)) };
      // 최우수상이면 걸어 둔 상금을 기업이 수상 팀에 직접 지급한 것으로 기록해요 (데모 — 수수료는 fees.ts 가 지급 기록에서 계산해요)
      return payPrize(awarded, proposal, action.award);
    }

    case "adoptProposal": {
      const proposal = state.proposals.find((p) => p.id === action.proposalId);
      const challenge = proposal ? state.challenges.find((c) => c.id === proposal.challengeId) : undefined;
      if (!proposal || !challenge || proposal.status === "adopted") return state;
      // 채택 = 인턴 참가가 정해졌어요. 인턴 채용은 무료라서 돈은 오가지 않아요
      const match: Match = { id: `m${state.seq}`, challengeId: challenge.id, proposalId: proposal.id, companyId: challenge.companyId, matchedOn: action.at.slice(0, 10) };
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

    case "setScoutable":
      return state.me.scoutable === action.scoutable ? state : { ...state, me: { ...state.me, scoutable: action.scoutable } };

    case "createPost": {
      const draft = action.draft;
      const context = postContext(state);
      if (validatePostDraft(draft, context).length > 0) return state;
      const id = `po${state.seq}`;
      if (draft.kind === "brag") {
        const activity = showableActivities(state).find((a) => a.id === draft.activityId);
        if (!activity) return state;
        const post: BragPost = {
          id,
          kind: "brag",
          authorName: state.me.nickname,
          authorLevel: levelOf(myPoints(state)),
          body: draft.body.trim(),
          // 실적의 SDGs 가 자동으로 붙어요 (최대 3개)
          sdgIds: activity.sdgIds.slice(0, POST_LIMITS.maxSdgs),
          achievement: { activityId: activity.id, kind: activity.kind, title: activity.title, companyName: activity.companyName, award: activity.award ?? null, sdgIds: activity.sdgIds },
          createdAt: action.at,
          likes: 0,
          likedBy: [],
          mine: true,
        };
        return { ...state, seq: state.seq + 1, posts: [post, ...state.posts] };
      }
      const channel = draft.officialChannel ?? DEFAULT_OFFICIAL_CHANNEL;
      // 공식 SNS 게시 신청: 기업이 고른 날짜(비웠으면 고를 수 있는 가장 빠른 날). 회사당 월 4회는 위의 검사가 지켜요
      const officialOn = draft.requestOfficial ? resolveOfficialDate(draft, context) : null;
      const post: PrPost = {
        id,
        kind: "pr",
        companyId: state.myCompanyId,
        title: (draft.title ?? "").trim(),
        body: draft.body.trim(),
        sdgIds: uniqueSdgs(draft.sdgIds),
        challengeId: draft.challengeId || null,
        official: officialOn ? { on: officialOn, channel, feeYen: OFFICIAL_SHARE_FEE_YEN, status: "scheduled", postUrl: null } : null,
        createdAt: action.at,
        likes: 0,
        likedBy: [],
        mine: true,
      };
      return { ...state, seq: state.seq + 1, posts: [post, ...state.posts] };
    }

    case "togglePostLike": {
      const post = state.posts.find((p) => p.id === action.postId);
      if (!post || (post.mine && authorRole(post.kind) === action.role)) return state;
      const liked = post.likedBy.includes(action.role);
      const likedBy = liked ? post.likedBy.filter((r) => r !== action.role) : [...post.likedBy, action.role];
      return { ...state, posts: state.posts.map((p) => (p.id === post.id ? { ...p, likedBy, likes: p.likes + (liked ? -1 : 1) } : p)) };
    }

    case "deletePost": {
      const post = state.posts.find((p) => p.id === action.postId);
      // 내 글만 지울 수 있어요. 공식 게시 날짜는 글에 들어 있어서 글과 함께 비워져요.
      if (!post || !post.mine || authorRole(post.kind) !== action.role) return state;
      return { ...state, posts: state.posts.filter((p) => p.id !== post.id) };
    }

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

    case "postResearchRequest":
      return postResearchRequest(state, action.draft, action.at);

    case "acceptResearchRequest":
      return acceptResearchRequest(state, action.requestId, action.at);

    case "submitResearchResult":
      return submitResearchResult(state, action.requestId, action.draft, action.at);

    case "completeResearchRequest":
      return completeResearchRequest(state, action.requestId, action.at);

    case "postWorkRequest":
      return postWorkRequest(state, action.draft, action.at);

    case "respondWorkRequest":
      return respondWorkRequest(state, action.requestId, action.accept, action.at);

    case "applyWorkRequest":
      return applyWorkRequest(state, action.requestId, action.message, action.at);

    case "chooseWorkApplicant":
      return chooseWorkApplicant(state, action.requestId, action.companyId, action.at);

    case "deliverWork":
      return deliverWork(state, action.requestId, action.note, action.at);

    case "completeWork":
      return completeWork(state, action.requestId, action.at);

    case "rate":
      return rate(state, action.role, action.draft, action.at);
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
    posts: state.posts.map((p) => {
      const createdAt = shift(p.createdAt, delta);
      return p.kind === "pr" && p.official ? { ...p, createdAt, official: { ...p.official, on: shift(p.official.on, delta) } } : { ...p, createdAt };
    }),
    esgGeneratedOn: state.esgGeneratedOn ? shift(state.esgGeneratedOn, delta) : null,
    wallet: { entries: state.wallet.entries.map((e) => ({ ...e, date: shift(e.date, delta) })) },
    prizePayments: state.prizePayments.map((p) => ({ ...p, promisedOn: shift(p.promisedOn, delta), paidOn: p.paidOn ? shift(p.paidOn, delta) : null })),
    researchRequests: state.researchRequests.map((r) => ({
      ...r,
      postedOn: shift(r.postedOn, delta),
      dueOn: shift(r.dueOn, delta),
      acceptedOn: r.acceptedOn ? shift(r.acceptedOn, delta) : null,
      result: r.result ? { ...r.result, submittedAt: shift(r.result.submittedAt, delta) } : null,
      completedOn: r.completedOn ? shift(r.completedOn, delta) : null,
    })),
    workRequests: state.workRequests.map((w) => ({
      ...w,
      postedOn: shift(w.postedOn, delta),
      dueOn: shift(w.dueOn, delta),
      applications: w.applications.map((a) => ({ ...a, appliedOn: shift(a.appliedOn, delta) })),
      acceptedOn: w.acceptedOn ? shift(w.acceptedOn, delta) : null,
      deliveredOn: w.deliveredOn ? shift(w.deliveredOn, delta) : null,
      completedOn: w.completedOn ? shift(w.completedOn, delta) : null,
    })),
    ratings: state.ratings.map((r) => ({ ...r, createdOn: shift(r.createdOn, delta) })),
  };
}
