// SNS 피드(F-503 학생 자랑 글 · F-504 기업 홍보 글, 학생·기업이 함께 쓰는 탭): 글 목록(최신순) · 필터(전체/기업 홍보/학생 자랑) · 좋아요 · 공유 · 삭제 · 글쓰기.
// 목록은 core 의 selectFeed 가 만들어요. 글을 올리면 이 탭이 ?posted=1 로 열려서 맨 위에 "올렸어요" 안내가 떠요 (닫으면 값을 지워요).
// 좋아요는 학생·기업 계정이 따로 세고, 삭제는 글을 쓴 계정에서만 돼요 (규칙은 core 의 reducer).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import type { Role } from "@sdgs-compass/core/domain";
import { formatDate } from "@sdgs-compass/core/format";
import { selectFeed, type FeedFilter, type PostVM } from "@sdgs-compass/core/selectors";
import { PostCard, type PostLink } from "@/components/PostCard";
import { Screen, ScreenTitle } from "@/components/Screen";
import { Button, Chip, Empty, Notice, type NoticeTone } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { bragActivityId, FEED_LINK_ICON, FEED_LINK_LABEL, feedLinks, kindOfRole } from "@/lib/feed";
import { composeHref } from "@/lib/nav";
import { CLEAR_POSTED_PARAMS, parsePostedParams } from "@/lib/postForm";
import { postSharePayload } from "@/lib/shareText";
import { SPACE } from "@/theme";

interface FeedNotice {
  tone: NoticeTone;
  text: string;
}

export function FeedScreen({ role }: { role: Role }) {
  const { demo, locale, t, dispatch } = useApp();
  const router = useRouter();
  const posted = parsePostedParams(useLocalSearchParams());
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [notice, setNotice] = useState<FeedNotice | null>(null);
  const [sawPosted, setSawPosted] = useState(false);
  // 글을 올리고 돌아오면 필터를 "전체"로 되돌려요 — 방금 올린 글이 걸러져서 안 보이면 안 되니까요. 렌더 중에 맞추는 방식이라 effect 가 필요 없어요.
  if ((posted !== null) !== sawPosted) {
    setSawPosted(posted !== null);
    if (posted !== null) setFilter("all");
  }
  const vm = useMemo(() => selectFeed(demo, locale, role, filter), [demo, locale, role, filter]);

  const dismissPosted = () => {
    if (posted !== null) router.setParams(CLEAR_POSTED_PARAMS);
  };

  const like = (post: PostVM) => {
    dismissPosted();
    dispatch({ type: "togglePostLike", postId: post.id, role });
  };
  const remove = (post: PostVM) => {
    dismissPosted();
    dispatch({ type: "deletePost", postId: post.id, role });
  };
  const share = async (post: PostVM) => {
    try {
      const result = await Share.share(postSharePayload(post));
      // 취소(dismissedAction)는 iOS 에서만 와요. 공유 메뉴를 열었을 때만 안내를 보여요.
      setNotice(result.action === Share.sharedAction ? { tone: "success", text: t("mobile.shareDone") } : null);
    } catch {
      setNotice({ tone: "danger", text: t("error.generic") });
    }
  };
  const linksOf = (post: PostVM): PostLink[] =>
    feedLinks(post, role, bragActivityId(demo.posts, post.id)).map((link) => ({
      key: link.kind,
      icon: FEED_LINK_ICON[link.kind],
      label: t(FEED_LINK_LABEL[link.kind]),
      onPress: () => router.push(link.href),
    }));

  return (
    <Screen tabbed testID="screen-feed">
      <ScreenTitle title={t("feed.title")} subtitle={t(role === "b2c" ? "feed.subtitle.b2c" : "feed.subtitle.b2b")} />

      <Button testID="feed-write" icon="✍️" label={t(role === "b2c" ? "feed.write.b2c" : "feed.write.b2b")} onPress={() => router.push(composeHref(kindOfRole(role)))} />

      {posted ? (
        <Notice testID="feed-posted" tone="success" message={posted.officialOn ? t("post.postedOfficial", { date: formatDate(posted.officialOn, locale) }) : t("post.posted")}>
          <Button testID="feed-posted-close" small variant="ghost" label={t("common.close")} onPress={dismissPosted} style={styles.closePosted} />
        </Notice>
      ) : null}

      <View accessibilityRole="radiogroup" accessibilityLabel={t("feed.title")} style={styles.filters}>
        {vm.filters.map((item) => (
          <Chip
            key={item.id}
            testID={`feed-filter-${item.id}`}
            kind="radio"
            label={`${item.label} ${item.count}`}
            accessibilityLabel={`${item.label}, ${item.count}`}
            selected={item.id === filter}
            onPress={() => {
              dismissPosted();
              setFilter(item.id);
            }}
          />
        ))}
      </View>

      {notice ? <Notice testID="feed-notice" tone={notice.tone} message={notice.text} /> : null}

      {vm.posts.length === 0 ? (
        <Empty testID="feed-empty">{t("feed.empty")}</Empty>
      ) : (
        <View style={styles.list}>
          {vm.posts.map((post) => (
            <PostCard
              key={post.id}
              testID={`post-${post.id}`}
              post={post}
              onLike={() => like(post)}
              onDelete={() => remove(post)}
              onShare={() => void share(post)}
              links={linksOf(post)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  closePosted: { alignSelf: "flex-end" },
  list: { gap: SPACE.md },
});
