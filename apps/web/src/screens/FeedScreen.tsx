"use client";

// SNS 피드(F-503 학생 자랑 글 · F-504 기업 홍보 글) = 용사의 업적을 전하는 「SDGs冒険新聞」(#48): 제호(날짜 · 호수) 아래에
// 기사(자랑 글 — 수상은 용사의 동상)와 광고 칸(홍보 글 — 언제나 「広告（PR）」)이 최신순으로 이어져요. 좋아요·공유·삭제 · 글쓰기는 그대로.
// 학생과 기업이 같은 화면을 써요 — 역할에 따라 "내 글"과 단추가 달라져요(계산은 core 의 selectFeed). 설계는 docs/sns-feed.md.
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Role, SocialPost } from "@sdgs-compass/core/domain";
import { formatDate } from "@sdgs-compass/core/format";
import { authorRole, officialChannelLabel } from "@sdgs-compass/core/post";
import { selectFeed, type FeedFilter, type PostVM } from "@sdgs-compass/core/selectors";
import { PostCard, type PostLinks } from "@/components/PostCard";
import { Banner, ButtonLink, Empty } from "@/components/ui";
import { browserShareEnv, shareOrCopy } from "@/lib/clipboard";
import { applicantsHref, certificateHref, challengeHref, postNewHref, shareHref } from "@/lib/routes";
import { useSession } from "@/lib/session";

type Notice = { tone: "success" | "danger" | "info"; text: string } | null;

/** 자랑 글에 붙은 내 실적의 id (카드뉴스 화면으로 이어질 때 써요) */
function activityIdOf(post: SocialPost | undefined): string | null {
  return post?.kind === "brag" ? post.achievement.activityId : null;
}

/**
 * 카드에서 이어지는 화면들. 학생은 챌린지 상세·증명서·카드뉴스로, 기업은 우리 회사 글의 챌린지(응모자 화면)로만 가요
 * (기업이 학생 화면으로 가면 경로 가드가 돌려보내니 처음부터 단추를 보이지 않아요).
 */
function linksFor(post: PostVM, role: Role, activityId: string | null): PostLinks {
  if (role === "b2b") return { challenge: post.challenge && post.mine ? applicantsHref(post.challenge.id) : null, certificate: null, card: null };
  return {
    challenge: post.challenge ? challengeHref(post.challenge.id) : null,
    certificate: post.achievement?.certificateId ? certificateHref(post.achievement.certificateId) : null,
    card: post.mine && post.kind === "brag" && activityId ? shareHref(activityId) : null,
  };
}

export function FeedScreen() {
  const { demo, locale, role, t, dispatch } = useSession();
  const postedId = useSearchParams().get("posted");
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [notice, setNotice] = useState<Notice>(null);
  const [removedTick, setRemovedTick] = useState(0);
  const filtersRef = useRef<HTMLDivElement>(null);
  const vm = useMemo(() => selectFeed(demo, locale, role, filter), [demo, locale, role, filter]);
  const rawPosts = useMemo(() => new Map(demo.posts.map((post) => [post.id, post])), [demo.posts]);

  // 글쓰기에서 막 돌아왔다면(주소의 posted) 그 글이 내 글일 때 "올렸어요" 안내를 보여 주고 카드를 강조해요
  const posted = postedId ? rawPosts.get(postedId) : undefined;
  const postedText =
    posted && posted.mine && authorRole(posted.kind) === role
      ? posted.kind === "pr" && posted.official
        ? t("post.postedOfficial", { channel: officialChannelLabel(posted.official.channel, locale), date: formatDate(posted.official.on, locale) })
        : t("post.posted")
      : null;

  // 글을 지우면 눌렀던 단추가 사라져요 → 키보드 사용자가 길을 잃지 않게 포커스를 목록 위(필터 묶음)로 옮겨요
  useEffect(() => {
    if (removedTick > 0) filtersRef.current?.focus();
  }, [removedTick]);

  const like = (post: PostVM) => dispatch({ type: "togglePostLike", postId: post.id, role });
  const remove = (post: PostVM) => {
    dispatch({ type: "deletePost", postId: post.id, role });
    setRemovedTick((n) => n + 1);
  };
  const share = async (post: PostVM) => {
    const result = await shareOrCopy({ title: post.title ?? post.authorName, text: post.shareText }, browserShareEnv());
    if (result === "shared") setNotice({ tone: "success", text: t("web.share.shared") });
    else if (result === "copied") setNotice({ tone: "info", text: t("share.copied") });
    else if (result === "failed") setNotice({ tone: "danger", text: t("web.share.copyFail") });
    else setNotice(null);
  };

  const writeKey = role === "b2b" ? "feed.write.b2b" : "feed.write.b2c";
  return (
    <div className={role === "b2c" ? "screen newspaper" : "stack stack--lg newspaper"}>
      {/* 신문의 제호(#48): 호수 · 날짜 · 「SDGs冒険新聞」 · 한 줄 소개 — 글쓰기 단추는 제호 오른쪽 위 */}
      <header className="newspaper__masthead">
        <div className="newspaper__edition">
          <span>{vm.masthead.issueLabel}</span>
          <span>{vm.masthead.dateLabel}</span>
        </div>
        <h1 className="newspaper__title">{vm.masthead.title}</h1>
        <p className="newspaper__tagline">{vm.masthead.tagline}</p>
        <div className="newspaper__write">
          <ButtonLink href={postNewHref(role)} size="sm">
            <span aria-hidden="true">✏️</span> {t(writeKey)}
          </ButtonLink>
        </div>
      </header>
      <p className="small muted">{t(role === "b2b" ? "feed.subtitle.b2b" : "feed.subtitle.b2c")}</p>

      <div className="live" aria-live="polite">
        {postedText ? <Banner tone="success">{postedText}</Banner> : null}
        {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      </div>

      <div className="chips" role="group" aria-label={t("feed.title")} tabIndex={-1} ref={filtersRef}>
        {vm.filters.map((item) => (
          <button key={item.id} type="button" className="chip" aria-pressed={vm.filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label} <span className="chip__count">{item.count}</span>
          </button>
        ))}
      </div>

      {vm.posts.length === 0 ? (
        <Empty>{t("feed.empty")}</Empty>
      ) : (
        <ul className={role === "b2b" ? "card-list feed-list feed-list--wide newspaper__list" : "card-list feed-list newspaper__list"}>
          {vm.posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} links={linksFor(post, role, activityIdOf(rawPosts.get(post.id)))} highlight={post.id === postedId && postedText !== null} onLike={like} onDelete={remove} onShare={share} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
