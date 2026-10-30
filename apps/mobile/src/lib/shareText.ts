// SNS 카드뉴스(SCR-05)를 운영체제의 공유 메뉴(React Native Share)에 넘길 내용과, 화면이 쓰는 작은 규칙들.
import { MAX_SHARE_ACTIVITIES, SHARE_POINTS } from "@sdgs-compass/core/impact";
import type { MessageKey } from "@sdgs-compass/core/messages";
import type { PostVM } from "@sdgs-compass/core/selectors";
import type { CardTemplate, ShareCard } from "@sdgs-compass/core/shareCard";

export interface SharePayload {
  title: string;
  message: string;
}

/** 공유 메뉴에 넘길 제목과 본문 (본문 = SNS 에 올릴 글 전체). 닉네임과 성과만 들어 있어요. */
export function sharePayload(card: ShareCard): SharePayload {
  return { title: card.headline, message: card.caption };
}

/** SNS 피드의 글을 공유 메뉴에 넘길 제목과 본문. 홍보 글은 글 제목이, 자랑 글은 글쓴이 이름이 제목이에요 (본문은 [PR] 표시·SDGs 해시태그가 붙은 shareText) */
export function postSharePayload(post: Pick<PostVM, "title" | "authorName" | "shareText">): SharePayload {
  return { title: post.title ?? post.authorName, message: post.shareText };
}

/** 해시태그 문구를 낱개로 나눠요 ("#a #b" → ["#a", "#b"]) */
export function hashtagList(hashtags: string): string[] {
  return hashtags.split(/\s+/).filter((tag) => tag.startsWith("#"));
}

/** 템플릿 이름의 문구 키 */
export const TEMPLATE_LABEL_KEY: Record<CardTemplate, MessageKey> = {
  instagram: "share.templateInstagram",
  linkedin: "share.templateLinkedin",
};

/** "앱 내 저장"을 눌렀을 때 쌓이는 발신 실적 포인트 (공유 실적은 MAX_SHARE_ACTIVITIES 회까지만 포인트가 돼요) */
export function savePoints(shares: number): number {
  return shares < MAX_SHARE_ACTIVITIES ? SHARE_POINTS : 0;
}
