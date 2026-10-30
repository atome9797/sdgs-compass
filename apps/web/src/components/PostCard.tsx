"use client";

// SNS 피드의 글 카드 (학생 자랑 글 F-503 · 기업 홍보 글 F-504). 보여 줄 값은 core 의 selectFeed 가 다 계산해 두었고,
// 여기서는 그리기와 "단추를 눌렀다"고 알리는 일만 해요. 글쓰기 화면의 미리보기에도 같은 카드를 써요(preview).
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { PostVM } from "@sdgs-compass/core/selectors";
import { SdgMiniRow } from "@/components/sdg";
import { Tag } from "@/components/ui";
import { useSession } from "@/lib/session";

/** 카드에서 이어지는 화면들의 주소. 없으면 그 단추를 보이지 않아요 */
export interface PostLinks {
  /** 연결된 챌린지 (학생: 챌린지 상세 / 기업: 우리 회사 글이면 응모자 화면) */
  challenge: string | null;
  /** 내 실적의 디지털 증명서 */
  certificate: string | null;
  /** 내 자랑 글의 실적을 카드뉴스로 */
  card: string | null;
}

export interface PostCardProps {
  post: PostVM;
  links?: PostLinks;
  /** 방금 올린 글: 테두리로 강조해요 */
  highlight?: boolean;
  /** 글쓰기 화면의 미리보기: 단추와 날짜를 숨기고 "미리보기" 표시를 붙여요. placeholder = 안내 문구로 채운 칸이 있어요 */
  preview?: { placeholder: boolean };
  onLike?: (post: PostVM) => void;
  onDelete?: (post: PostVM) => void;
  onShare?: (post: PostVM) => void;
}

export function PostCard({ post, links, highlight = false, preview, onLike, onDelete, onShare }: PostCardProps) {
  const { t } = useSession();
  const nameId = useId();
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // "삭제"를 누르면 확인 단추가 나타나요 — 키보드 사용자가 길을 잃지 않게 안전한 쪽(취소)에 포커스를 둬요
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  const className = ["card", "fcard", post.kind === "pr" ? "fcard--pr" : "fcard--brag", post.mine && !preview ? "fcard--mine" : "", highlight ? "fcard--new" : "", preview?.placeholder ? "fcard--draft" : ""]
    .filter(Boolean)
    .join(" ");
  const achievement = post.achievement;
  // "내 글"·"미리보기" 표시는 머리말 위에 따로 한 줄로 둬요 (회사 이름이 긴 좁은 화면에서도 이름이 꺾이지 않게)
  const flag = preview ? t("post.preview") : post.mine ? t("feed.mine") : null;

  return (
    <article className={className} aria-labelledby={nameId}>
      {flag ? (
        <div className="fcard__flag">
          <Tag tone={preview ? undefined : "success"}>{flag}</Tag>
        </div>
      ) : null}
      <header className="fcard__head">
        <span className="fcard__avatar" style={post.avatarColor ? { background: post.avatarColor } : undefined} aria-hidden="true">
          {post.avatar}
        </span>
        <div className="fcard__who">
          <p className="fcard__name" id={nameId}>
            {post.authorName}
            {post.verified ? (
              <span className="fcard__verified" role="img" aria-label={t("mobile.companyVerified")}>
                ✓
              </span>
            ) : null}
          </p>
          <p className="fcard__meta">{preview ? post.authorMeta : `${post.authorMeta} · ${post.dateLabel}`}</p>
        </div>
        <Tag tone={post.kind === "pr" ? "warning" : "info"}>{post.chipLabel}</Tag>
      </header>

      {post.title ? <h2 className="fcard__title">{post.title}</h2> : null}
      <p className="fcard__body">{post.body}</p>

      {achievement ? (
        <div className="fcard__ach">
          <div className="fcard__ach-head">
            <Tag tone="info">{achievement.kindLabel}</Tag>
            {achievement.awardLabel ? <Tag tone="warning">🏆 {achievement.awardLabel}</Tag> : null}
          </div>
          <p className="fcard__ach-title">{achievement.title}</p>
          <p className="small muted">{achievement.companyName}</p>
        </div>
      ) : null}

      {post.challenge ? (
        <p className="fcard__challenge">
          <span aria-hidden="true">🎯</span> {post.challenge.title}
        </p>
      ) : null}

      {post.official ? (
        <div className="fcard__official">
          <p>
            <span aria-hidden="true">📣</span> {post.official.label}
          </p>
          <p className="fcard__official-fee">{post.official.feeLabel}</p>
        </div>
      ) : null}

      <SdgMiniRow ids={post.sdgIds} />

      {preview ? null : (
        <footer className="fcard__actions">
          {post.canLike ? (
            <button type="button" className="fcard__action fcard__like" aria-pressed={post.likedByMe} aria-label={`${t("feed.like")} ${post.likes}`} onClick={() => onLike?.(post)}>
              <span aria-hidden="true">{post.likedByMe ? "♥" : "♡"}</span>
              <span aria-hidden="true">{post.likes}</span>
            </button>
          ) : (
            <span className="fcard__action fcard__likes" role="img" aria-label={`${t("feed.like")} ${post.likes}`}>
              <span aria-hidden="true">♡ {post.likes}</span>
            </span>
          )}
          <button type="button" className="fcard__action" onClick={() => onShare?.(post)}>
            <span aria-hidden="true">📤</span> {t("common.share")}
          </button>
          {links?.challenge ? (
            <Link className="fcard__action" href={links.challenge}>
              <span aria-hidden="true">🎯</span> {t("feed.viewChallenge")}
            </Link>
          ) : null}
          {links?.certificate ? (
            <Link className="fcard__action" href={links.certificate}>
              <span aria-hidden="true">📜</span> {t("feed.viewCertificate")}
            </Link>
          ) : null}
          {links?.card ? (
            <Link className="fcard__action" href={links.card}>
              <span aria-hidden="true">🖼️</span> {t("feed.makeCard")}
            </Link>
          ) : null}
          {post.canDelete ? (
            confirming ? (
              <div className="fcard__confirm" role="group" aria-label={t("feed.delete")}>
                <span className="fcard__confirm-text">{t("feed.deleteConfirm")}</span>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => onDelete?.(post)}>
                  {t("feed.delete")}
                </button>
                <button type="button" className="btn btn--secondary btn--sm" ref={cancelRef} onClick={() => setConfirming(false)}>
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <button type="button" className="fcard__action fcard__delete" onClick={() => setConfirming(true)}>
                <span aria-hidden="true">🗑️</span> {t("feed.delete")}
              </button>
            )
          ) : null}
        </footer>
      )}
    </article>
  );
}
