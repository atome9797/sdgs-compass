// SNS 피드(F-503·F-504) 화면의 작은 규칙들: 글을 쓰는 쪽, 글 카드에서 갈 수 있는 곳(바로가기), 자랑 글에 붙은 실적 찾기.
import type { PostKind, Role, SocialPost } from "@sdgs-compass/core/domain";
import type { MessageKey } from "@sdgs-compass/core/messages";
import type { PostVM } from "@sdgs-compass/core/selectors";
import { applicantsHref, certificateHref, challengeHref, shareHref } from "./nav";

/** 이 계정이 쓰는 글의 종류: 학생은 자랑 글, 기업은 홍보 글 */
export function kindOfRole(role: Role): PostKind {
  return role === "b2c" ? "brag" : "pr";
}

export type FeedLinkKind = "certificate" | "makeCard" | "challenge";

export interface FeedLink {
  kind: FeedLinkKind;
  href: string;
}

/** 바로가기 단추의 이름 */
export const FEED_LINK_LABEL: Record<FeedLinkKind, MessageKey> = {
  certificate: "feed.viewCertificate",
  makeCard: "feed.makeCard",
  challenge: "feed.viewChallenge",
};

/** 바로가기 단추의 아이콘(이모지) */
export const FEED_LINK_ICON: Record<FeedLinkKind, string> = {
  certificate: "🎓",
  makeCard: "🖼️",
  challenge: "🎯",
};

/**
 * 글 카드에서 갈 수 있는 곳. 증명서·카드뉴스·챌린지 상세는 학생 화면이라서 기업 계정에는 보여 주지 않아요.
 *  - 학생: 내 자랑 글 → 증명서 보기 · 카드뉴스로 만들기(그 실적을 미리 골라서) / 기업의 홍보 글 → 챌린지 보기
 *  - 기업: 우리 회사의 홍보 글 → 그 챌린지의 응모자 화면 (다른 회사의 챌린지는 열 곳이 없어요)
 * activityId = 자랑 글에 붙은 내 실적의 id (카드뉴스 화면에서 미리 고르는 값)
 */
export function feedLinks(post: Pick<PostVM, "kind" | "mine" | "achievement" | "challenge">, role: Role, activityId: string | null): FeedLink[] {
  const links: FeedLink[] = [];
  if (post.kind === "brag") {
    if (role !== "b2c") return links;
    if (post.achievement?.certificateId) links.push({ kind: "certificate", href: certificateHref(post.achievement.certificateId) });
    if (post.mine) links.push({ kind: "makeCard", href: shareHref(activityId) });
    return links;
  }
  if (post.challenge) {
    if (role === "b2c") links.push({ kind: "challenge", href: challengeHref(post.challenge.id) });
    else if (post.mine) links.push({ kind: "challenge", href: applicantsHref(post.challenge.id) });
  }
  return links;
}

/** 자랑 글에 붙은 내 실적(활동)의 id. 다른 학생의 샘플 글이나 홍보 글이면 null */
export function bragActivityId(posts: readonly SocialPost[], postId: string): string | null {
  const post = posts.find((p) => p.id === postId);
  return post && post.kind === "brag" ? post.achievement.activityId : null;
}
