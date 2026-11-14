"use client";

// SNS 피드의 글 = 「SDGs冒険新聞」의 기사(#48): 학생 자랑 글(F-503)은 용사의 업적 기사(헤드라인 · 기업과 퀘스트 · 본인의 한마디),
// 수상 기사는 용사의 동상(금 · 은 · 동)을 세우고, 기업 홍보 글(F-504)은 「広告（PR）」 칸이에요. 보여 줄 값은 core 의 selectFeed 가 다 계산해 두었고,
// 여기서는 그리기와 "단추를 눌렀다"고 알리는 일만 해요. 글쓰기 화면의 미리보기에도 같은 기사를 써요(preview).
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { pngDataUri } from "@sdgs-compass/core/png";
import type { PostVM, StatueVM } from "@sdgs-compass/core/selectors";
import { heroStatue } from "@sdgs-compass/core/statue";
import { CertMarkButton, CertMarkNote, useMarkDisclosure } from "@/components/CertMark";
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

/** 동상 그림(상마다 한 번만 만들어요) */
const statueUris = new Map<string, string>();
function statueUri(award: StatueVM["award"]): string {
  let uri = statueUris.get(award);
  if (!uri) {
    uri = pngDataUri(heroStatue(award), 4);
    statueUris.set(award, uri);
  }
  return uri;
}

/** 수상 기사의 동상: 그림 + 명판(상 · 퀘스트 · 기업) */
function Statue({ statue }: { statue: StatueVM }) {
  return (
    <figure className="news__statue" data-award={statue.award}>
      <span className="news__statue-img" role="img" aria-label={statue.ariaLabel} style={{ backgroundImage: `url(${statueUri(statue.award)})` }} />
      <figcaption className="news__plaque">
        <span className="news__plaque-caption">{statue.caption}</span>
        {statue.plaque.map((line, i) => (
          <span key={`${i}-${line}`} className={i === 0 ? "news__plaque-award" : "news__plaque-line"}>
            {line}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function PostCard({ post, links, highlight = false, preview, onLike, onDelete, onShare }: PostCardProps) {
  const { t } = useSession();
  const nameId = useId();
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const mark = useMarkDisclosure();

  // "삭제"를 누르면 확인 단추가 나타나요 — 키보드 사용자가 길을 잃지 않게 안전한 쪽(취소)에 포커스를 둬요
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  const className = ["news", "fcard", post.kind === "pr" ? "news--ad fcard--pr" : "news--article fcard--brag", post.mine && !preview ? "fcard--mine" : "", highlight ? "fcard--new" : "", preview?.placeholder ? "fcard--draft" : ""]
    .filter(Boolean)
    .join(" ");
  const achievement = post.achievement;
  // "내 글"·"미리보기" 표시는 머리말 위에 따로 한 줄로 둬요 (회사 이름이 긴 좁은 화면에서도 이름이 꺾이지 않게)
  const flag = preview ? t("post.preview") : post.mine ? t("feed.mine") : null;

  const headlineId = `${nameId}-headline`;
  return (
    <article className={className} aria-labelledby={headlineId}>
      {flag ? (
        <div className="fcard__flag">
          <Tag tone={preview ? undefined : "success"}>{flag}</Tag>
        </div>
      ) : null}
      {/* 신문 기사(#48): 칸 머리 → 헤드라인 → 기업과 퀘스트 → (수상이면 동상) → 쓴 사람 · 날짜 → 본문 */}
      <p className="news__kicker">{post.kicker}</p>
      <h2 className="news__headline" id={headlineId}>
        {post.headline}
      </h2>
      {post.subhead ? <p className="news__subhead">{post.subhead}</p> : null}
      {post.statue ? <Statue statue={post.statue} /> : null}
      <header className="fcard__head news__byline">
        <span className="fcard__avatar" style={post.avatarColor ? { background: post.avatarColor } : undefined} aria-hidden="true">
          {post.avatar}
        </span>
        <div className="fcard__who">
          {/* 기업 글: 회사 이름·확인 표시 옆에 SDGs 실천 마크(#35) — 좁으면 다음 줄로 내려가요. 글 카드의 이름(aria-labelledby)에는 넣지 않아요 */}
          <div className="fcard__name-row">
            <p className="fcard__name" id={nameId}>
              {post.authorName}
              {post.verified ? (
                <span className="fcard__verified" role="img" aria-label={t("mobile.companyVerified")}>
                  ✓
                </span>
              ) : null}
            </p>
            {post.companyMark ? <CertMarkButton mark={post.companyMark} open={mark.open} noteId={mark.noteId} onToggle={mark.toggle} /> : null}
          </div>
          <p className="fcard__meta">{preview ? post.authorMeta : `${post.authorMeta} · ${post.dateLabel}`}</p>
        </div>
        <Tag tone={post.kind === "pr" ? "warning" : "info"}>{post.chipLabel}</Tag>
      </header>
      {post.companyMark ? <CertMarkNote mark={post.companyMark} open={mark.open} noteId={mark.noteId} /> : null}

      {/* 자랑 글의 본문 = 본인의 한마디(인용), 홍보 글의 본문 = 광고 글 */}
      {achievement ? (
        <blockquote className="fcard__body news__quote">
          <span className="news__quote-label">{t("news.comment")}</span>
          {post.body}
        </blockquote>
      ) : (
        <p className="fcard__body news__body">{post.body}</p>
      )}

      {achievement ? (
        <p className="news__record">
          <span className="news__record-kind">{achievement.kindLabel}</span>
          {achievement.awardLabel ? <span className="news__record-award">🏆 {achievement.awardLabel}</span> : null}
        </p>
      ) : null}

      {post.challenge ? (
        <p className="fcard__challenge">
          <span aria-hidden="true">🎯</span> {post.challenge.title}
        </p>
      ) : null}

      {/* 공식 SNS 게시: 쓴 회사는 예정이면 날짜·게시료, 다른 사람은 게시된 뒤에만 보여요(core 의 PostVM.official). 링크는 새 탭에서 열려요 */}
      {post.official ? (
        <div className={post.official.status === "posted" ? "fcard__official fcard__official--posted" : "fcard__official"}>
          <p>
            <span aria-hidden="true">📣</span> {post.official.label}
          </p>
          {post.official.feeLabel ? <p className="fcard__official-fee">{post.official.feeLabel}</p> : null}
          {post.official.link && !preview ? (
            <a className="fcard__official-link" href={post.official.link.url} target="_blank" rel="noopener noreferrer">
              {post.official.link.label}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only">{t("web.newTab")}</span>
            </a>
          ) : null}
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
