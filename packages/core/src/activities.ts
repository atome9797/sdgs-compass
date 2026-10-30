// 내 활동 목록: 앱을 쓰기 전의 기록(샘플) + 데모에서 내가 제출·수상·공유한 것을 합쳐요. Impact Index·배지·증명서·카드뉴스가 모두 이 목록에서 나와요.
import type { Activity, ActivityKind, DemoState } from "./domain";
import { AWARD_POINTS, MAX_SHARE_ACTIVITIES, reviewBonus, SHARE_POINTS } from "./impact";
import { pick } from "./i18n";

type ActivitySource = Pick<DemoState, "history" | "proposals" | "challenges" | "companies" | "shares" | "today">;

export function deriveActivities(state: ActivitySource): Activity[] {
  const list: Activity[] = [...state.history];
  for (const proposal of state.proposals) {
    if (!proposal.mine) continue;
    const challenge = state.challenges.find((c) => c.id === proposal.challengeId);
    if (!challenge) continue;
    const company = state.companies.find((c) => c.id === challenge.companyId);
    const companyName = company?.name ?? "";
    const scores = proposal.review ? { creativity: proposal.review.creativity, feasibility: proposal.review.feasibility, sdgContribution: proposal.review.sdgContribution } : undefined;
    list.push({
      id: `act-${proposal.id}`,
      kind: "submission",
      title: challenge.title,
      companyName,
      sdgIds: challenge.sdgIds,
      date: proposal.submittedAt.slice(0, 10),
      points: challenge.impactPoints + reviewBonus(scores),
      scores,
      proposalId: proposal.id,
    });
    if (proposal.award) {
      list.push({
        id: `act-${proposal.id}-award`,
        kind: "award",
        title: challenge.title,
        companyName,
        sdgIds: challenge.sdgIds,
        date: (proposal.review?.reviewedAt ?? proposal.submittedAt).slice(0, 10),
        points: AWARD_POINTS[proposal.award],
        award: proposal.award,
        proposalId: proposal.id,
      });
    }
  }
  for (let i = 0; i < Math.min(state.shares, MAX_SHARE_ACTIVITIES); i++) {
    list.push({
      id: `act-share-${i + 1}`,
      kind: "share",
      title: { ja: "カードニュースを共有", ko: "카드뉴스 공유" },
      companyName: { ja: "SDGsコンパス", ko: "SDGs 컴파스" },
      sdgIds: [],
      date: state.today,
      points: SHARE_POINTS,
    });
  }
  // 최근 것부터, 같은 날이면 포인트가 큰 것부터
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.points - a.points || pick(a.title, "ja").localeCompare(pick(b.title, "ja")));
}

/** 알릴 수 있는 활동 (공유 기록은 빼요) */
export type ShowableActivity = Activity & { kind: Exclude<ActivityKind, "share"> };

/** 카드뉴스·증명서·SNS 글로 알릴 수 있는 활동: 수상 → 제출·참가 순이에요 */
export function showableActivities(state: ActivitySource): ShowableActivity[] {
  const list = deriveActivities(state).filter((a): a is ShowableActivity => a.kind !== "share");
  return [...list.filter((a) => a.kind === "award"), ...list.filter((a) => a.kind !== "award")];
}
