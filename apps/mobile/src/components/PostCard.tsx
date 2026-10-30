// SNS 피드의 글 카드(F-503 학생 자랑 글 · F-504 기업 홍보 글): 글쓴이 · 종류 칩(홍보 글은 항상 "PR") · 제목/본문 · 붙은 실적 · SDGs · 공식 SNS 게시 예정 · 좋아요/공유/바로가기/삭제.
// 값은 모두 core 의 PostVM 이고 이 조각은 그리기만 해요. 삭제는 경고창 대신 카드 안에서 한 번 더 확인해요.
// preview 이면 동작 단추 없이 모양만 보여 줘요 (글쓰기 화면의 미리보기).
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { sdgLabel } from "@sdgs-compass/core/labels";
import type { PostAchievementVM, PostVM } from "@sdgs-compass/core/selectors";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Button, Card, Notice, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { COLORS, FONT_SIZE, HIT, RADIUS, SPACE } from "@/theme";

const AVATAR_SIZE = 40;

/** 카드 아래에 놓이는 바로가기 단추 하나 (어디로 갈지는 화면이 정해요) */
export interface PostLink {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
}

export interface PostCardProps {
  post: PostVM;
  /** 미리보기: 좋아요·공유·삭제·바로가기 단추를 그리지 않아요 */
  preview?: boolean;
  onLike?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  links?: readonly PostLink[];
  testID?: string;
}

/** 학생 글은 로고가 없어서 닉네임의 첫 글자를 동그라미에 */
function InitialAvatar({ letter }: { letter: string }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.initial}>
      <Text style={styles.initialLetter}>{letter}</Text>
    </View>
  );
}

/** 자랑 글에 붙은 실적: 종류 · 수상 · 제목 · 기업 */
function Achievement({ achievement, testID }: { achievement: PostAchievementVM; testID: string }) {
  const label = [achievement.kindLabel, achievement.awardLabel, achievement.title, achievement.companyName].filter((part) => part && part !== "").join(", ");
  return (
    <View testID={testID} accessible accessibilityLabel={label} style={styles.achievement}>
      {achievement.kindLabel !== "" || achievement.awardLabel ? (
        <View style={styles.badges}>
          {achievement.kindLabel !== "" ? <Badge label={achievement.kindLabel} /> : null}
          {achievement.awardLabel ? <Badge tone="warning" label={`🏆 ${achievement.awardLabel}`} /> : null}
        </View>
      ) : null}
      <Txt bold numberOfLines={3}>
        {achievement.title}
      </Txt>
      {achievement.companyName !== "" ? (
        <Txt variant="small" tone="muted" numberOfLines={1}>
          {achievement.companyName}
        </Txt>
      ) : null}
    </View>
  );
}

/** 좋아요: 남의 글이면 누르는 단추(켜짐/꺼짐), 내 글이면 개수만 */
function LikeButton({ post, onLike }: { post: PostVM; onLike?: () => void }) {
  const { t } = useApp();
  const label = `${t("feed.like")} ${post.likes}`;
  const glyph = post.likedByMe ? "♥" : "♡";
  const glyphColor = post.likedByMe ? COLORS.donation : COLORS.textMuted;
  if (!post.canLike || !onLike) {
    return (
      <View testID={`post-likes-${post.id}`} accessible accessibilityLabel={label} style={styles.likeStatic}>
        <Text style={[styles.likeGlyph, { color: glyphColor }]}>{glyph}</Text>
        <Txt variant="small" tone="muted" bold>
          {post.likes}
        </Txt>
      </View>
    );
  }
  return (
    <Pressable
      testID={`post-like-${post.id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: post.likedByMe }}
      onPress={onLike}
      style={({ pressed }) => [styles.like, post.likedByMe ? styles.likeOn : null, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Text style={[styles.likeGlyph, { color: glyphColor }]}>{glyph}</Text>
      <Txt variant="small" bold>
        {post.likes}
      </Txt>
    </Pressable>
  );
}

export function PostCard({ post, preview = false, onLike, onDelete, onShare, links = [], testID }: PostCardProps) {
  const { t, locale } = useApp();
  const [confirming, setConfirming] = useState(false);
  const isPr = post.kind === "pr";
  const showMeta = post.dateLabel !== "" || (post.mine && !preview);

  return (
    <View testID={testID}>
      <Card>
        <View style={styles.head}>
          {isPr ? <CompanyAvatar emoji={post.avatar} accent={post.avatarColor ?? COLORS.primary} size={AVATAR_SIZE} /> : <InitialAvatar letter={post.avatar} />}
          <View style={styles.headText}>
            <Txt bold numberOfLines={1} accessibilityLabel={post.verified ? `${post.authorName}, ${t("mobile.companyVerified")}` : undefined}>
              {post.authorName}
              {post.verified ? " ✓" : ""}
            </Txt>
            <Txt variant="small" tone="muted" numberOfLines={1}>
              {post.authorMeta}
            </Txt>
          </View>
          <Badge tone={isPr ? "warning" : "primary"} label={post.chipLabel} />
        </View>

        {post.title ? (
          <Txt variant="heading" accessibilityRole="header">
            {post.title}
          </Txt>
        ) : null}
        {post.body !== "" ? <Txt selectable>{post.body}</Txt> : null}

        {post.achievement ? <Achievement testID={`post-achievement-${post.id}`} achievement={post.achievement} /> : null}

        {post.sdgIds.length > 0 ? (
          <View accessible accessibilityLabel={post.sdgIds.map((id) => sdgLabel(id, locale)).join(", ")}>
            <SdgMiniRow ids={post.sdgIds} />
          </View>
        ) : null}

        {post.official ? (
          <View testID={`post-official-${post.id}`} accessible accessibilityLabel={`${post.official.label}, ${post.official.feeLabel}`} style={styles.official}>
            <Txt variant="small" bold style={styles.officialText}>
              📅 {post.official.label}
            </Txt>
            <Txt variant="small" tone="muted">
              {post.official.feeLabel}
            </Txt>
          </View>
        ) : null}

        {showMeta ? (
          <View style={styles.meta}>
            {post.dateLabel !== "" ? (
              <Txt variant="caption" tone="muted">
                {post.dateLabel}
              </Txt>
            ) : null}
            {post.mine && !preview ? <Badge tone="primary" label={t("feed.mine")} /> : null}
          </View>
        ) : null}

        {preview ? null : (
          <View style={styles.actions}>
            <LikeButton post={post} onLike={onLike} />
            {onShare ? <Button testID={`post-share-${post.id}`} small variant="ghost" icon="📤" label={t("common.share")} onPress={onShare} /> : null}
            {links.map((link) => (
              <Button key={link.key} testID={`post-${link.key}-${post.id}`} small variant="ghost" icon={link.icon} label={link.label} onPress={link.onPress} />
            ))}
            {post.canDelete && onDelete ? (
              <Button testID={`post-delete-${post.id}`} small variant="danger" label={t("feed.delete")} disabled={confirming} onPress={() => setConfirming(true)} />
            ) : null}
          </View>
        )}

        {confirming ? (
          <View style={styles.confirm}>
            <Notice testID={`post-delete-notice-${post.id}`} tone="warning" message={t("feed.deleteConfirm")} />
            <Button
              testID={`post-delete-confirm-${post.id}`}
              variant="danger"
              label={t("feed.delete")}
              onPress={() => {
                setConfirming(false);
                onDelete?.();
              }}
            />
            <Button testID={`post-delete-cancel-${post.id}`} variant="secondary" label={t("common.cancel")} onPress={() => setConfirming(false)} />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: SPACE.sm + 2 },
  headText: { flex: 1, gap: 1 },
  initial: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initialLetter: { fontSize: FONT_SIZE.lg, fontWeight: "800", color: COLORS.primaryDark },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.xs + 2 },
  achievement: {
    gap: SPACE.xs + 2,
    padding: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  official: { gap: 2, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primarySoft },
  // 연한 파랑 바탕 위에서 글자 대비가 4.5:1 이상이 되도록 가장 짙은 파랑
  officialText: { color: COLORS.primaryDark },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.xs },
  like: {
    minHeight: HIT,
    minWidth: HIT,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.xs + 2,
  },
  likeOn: { borderColor: COLORS.donation, backgroundColor: COLORS.card },
  likeStatic: { minHeight: HIT, paddingHorizontal: SPACE.md, flexDirection: "row", alignItems: "center", gap: SPACE.xs + 2 },
  likeGlyph: { fontSize: FONT_SIZE.lg + 1 },
  confirm: { gap: SPACE.sm },
});
