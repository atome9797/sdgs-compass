// 화면 경로 만들기 (typedRoutes 를 쓰지 않아서 글자로 적어요). 경로 규칙은 src/app 폴더 구조와 같아요 (expo-router 가 폴더·파일 이름으로 경로를 만들어요).
//   학생·개인: /  /feed  /search  /impact  /messages  /settings  /challenge/[id]  /challenge/submit/[id]  /certificate/[id]  /share  /feed/new
//   기업·단체: /b2b  /b2b/feed  /b2b/applicants  /b2b/talent  /b2b/esg  /b2b/settings  /b2b/new  /b2b/feed/new
import type { PostKind, Role } from "@sdgs-compass/core/domain";

export const ROUTES = {
  home: "/",
  feed: "/feed",
  feedNew: "/feed/new",
  search: "/search",
  impact: "/impact",
  messages: "/messages",
  settings: "/settings",
  share: "/share",
  b2bDashboard: "/b2b",
  b2bFeed: "/b2b/feed",
  b2bFeedNew: "/b2b/feed/new",
  b2bApplicants: "/b2b/applicants",
  b2bTalent: "/b2b/talent",
  b2bEsg: "/b2b/esg",
  b2bSettings: "/b2b/settings",
  b2bNew: "/b2b/new",
} as const;

export function challengeHref(id: string): string {
  return `/challenge/${encodeURIComponent(id)}`;
}

/** 기획서 제출(4단계) 화면 */
export function submitHref(id: string): string {
  return `/challenge/submit/${encodeURIComponent(id)}`;
}

/** 제출 수령증: 제출 화면과 같은 경로에 receipt=1 을 붙여요 */
export function receiptHref(id: string): string {
  return `${submitHref(id)}?receipt=1`;
}

export function certificateHref(id: string): string {
  return `/certificate/${encodeURIComponent(id)}`;
}

/** 기업 화면의 응모자·심사 (챌린지를 미리 고른 채로) */
export function applicantsHref(challengeId: string): string {
  return `${ROUTES.b2bApplicants}?id=${encodeURIComponent(challengeId)}`;
}

/** 카드뉴스 화면 (실적을 미리 골라서 열 수 있어요) */
export function shareHref(activityId?: string | null): string {
  return activityId ? `${ROUTES.share}?activity=${encodeURIComponent(activityId)}` : ROUTES.share;
}

/** 역할에 맞는 SNS 피드 탭 */
export function feedRoute(role: Role): string {
  return role === "b2b" ? ROUTES.b2bFeed : ROUTES.feed;
}

/**
 * 글쓰기 화면. 자랑 글(학생)은 올릴 실적을, 홍보 글(기업)은 연결할 챌린지를 미리 골라서 열 수 있어요.
 * 카드뉴스 화면의 "피드에도 올리기"와 응모자 화면의 "홍보하기"가 이 경로로 들어와요.
 */
export function composeHref(kind: PostKind, presetId?: string | null): string {
  const base = kind === "brag" ? ROUTES.feedNew : ROUTES.b2bFeedNew;
  if (!presetId) return base;
  return `${base}?${kind === "brag" ? "activity" : "challenge"}=${encodeURIComponent(presetId)}`;
}

/** 글을 올린 뒤 가는 피드 탭: 맨 위에 "올렸어요" 안내가 떠요. officialOn = 공식 SNS 게시 예정일(YYYY-MM-DD, 신청했을 때만) */
export function postedHref(role: Role, officialOn: string | null): string {
  const query = officialOn ? `posted=1&official=${encodeURIComponent(officialOn)}` : "posted=1";
  return `${feedRoute(role)}?${query}`;
}

/** 경로 매개변수(id 등)를 글자 하나로 읽어요 (배열이면 첫 번째, 없으면 빈 글자) */
export function paramText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** router 중 "뒤로 가기"에 필요한 부분만 (테스트에서 가짜로 바꿔 끼울 수 있어요) */
export interface BackRouter {
  canGoBack(): boolean;
  back(): void;
  replace(href: string): void;
}

/** 뒤로 갈 수 있으면 뒤로, 처음 열린 화면이라 갈 곳이 없으면 fallback 경로로 가요 */
export function goBack(router: BackRouter, fallback: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
