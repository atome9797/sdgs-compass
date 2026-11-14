// SNS 피드의 글 = 「SDGs冒険新聞」의 기사(#48, 웹 .news 와 같은 모양): 칸 머리(「勇者の業績」 · 홍보 글은 언제나 「広告（PR）」) · 헤드라인 · 기업과 퀘스트 ·
// 수상이면 용사의 동상(금 · 은 · 동) · 글쓴이 · 본인의 한마디(인용) · 실적 · SDGs · 공식 SNS 게시 · 좋아요/공유/바로가기/삭제.
// 값은 모두 core 의 PostVM 이고 이 조각은 그리기만 해요. 삭제는 경고창 대신 카드 안에서 한 번 더 확인해요.
// preview 이면 동작 단추 없이 모양만 보여 줘요 (글쓰기 화면의 미리보기).
import { useState } from "react";
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { Locale } from "@sdgs-compass/core/i18n";
import { sdgLabel } from "@sdgs-compass/core/labels";
import { pngDataUri } from "@sdgs-compass/core/png";
import type { PostAchievementVM, PostOfficialVM, PostVM, StatueVM } from "@sdgs-compass/core/selectors";
import { heroStatue } from "@sdgs-compass/core/statue";
import { CertMarkButton, CertMarkDetail } from "@/components/CertMark";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Button, Notice, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { COLORS, FONT_SIZE, HIT, RADIUS, SPACE } from "@/theme";

const AVATAR_SIZE = 40;
/** 신문의 색(웹 --news-* 와 같아요) */
const NEWS = { paper: "#F6F1E4", ink: "#1F1B16", sub: "#5C5346", rule: "#B9AE97", ad: "#FFFDF6", adTag: "#F3D98B", adTagText: "#5A4100" } as const;

/** 제호 · 헤드라인의 명조체(기기에 있는 것) */
export function newsSerif(locale: Locale): string {
  if (Platform.OS === "ios") return locale === "ko" ? "AppleMyungjo" : "Hiragino Mincho ProN";
  return "serif";
}

const statueUris = new Map<string, string>();
function statueUri(award: StatueVM["award"]): string {
  let uri = statueUris.get(award);
  if (!uri) {
    uri = pngDataUri(heroStatue(award), 6);
    statueUris.set(award, uri);
  }
  return uri;
}

/** 수상 기사의 동상: 그림 + 명판(상 · 퀘스트 · 기업) */
function Statue({ statue, locale, testID }: { statue: StatueVM; locale: Locale; testID: string }) {
  const serif = newsSerif(locale);
  const awardColor = statue.award === "grand" ? "#8A5E00" : statue.award === "excellence" ? "#4A5568" : "#8E5A30";
  return (
    <View style={styles.statue} testID={testID}>
      <Image source={{ uri: statueUri(statue.award) }} style={styles.statueImg} resizeMode="contain" accessible accessibilityRole="image" accessibilityLabel={statue.ariaLabel} />
      <View style={styles.plaque}>
        <Text style={[styles.plaqueCaption, { fontFamily: serif }]}>{statue.caption}</Text>
        {statue.plaque.map((line, i) => (
          <Text key={`${i}-${line}`} style={[i === 0 ? styles.plaqueAward : styles.plaqueLine, { fontFamily: serif }, i === 0 ? { color: awardColor } : null]}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

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

/** 자랑 글에 붙은 실적: 종류 · 수상 (퀘스트 · 기업은 헤드라인 밑 줄에) */
function Achievement({ achievement, testID }: { achievement: PostAchievementVM; testID: string }) {
  const label = [achievement.kindLabel, achievement.awardLabel, achievement.title, achievement.companyName].filter((part) => part && part !== "").join(", ");
  return (
    <View testID={testID} accessible accessibilityLabel={label} style={styles.record}>
      {achievement.kindLabel !== "" ? <Text style={styles.recordKind}>{achievement.kindLabel}</Text> : null}
      {achievement.awardLabel ? <Text style={styles.recordAward}>🏆 {achievement.awardLabel}</Text> : null}
    </View>
  );
}

/**
 * 공식 SNS 게시: 쓴 회사에게는 예정이면 날짜·게시료, 게시됨이면 링크 / 다른 사람에게는 게시된 뒤에만 「公式SNSでも紹介中」 + 링크 (core 의 PostVM.official).
 * 링크는 SNS 앱(없으면 브라우저)으로 열어요. 미리보기에서는 링크를 그리지 않아요.
 */
function Official({ official, postId, preview }: { official: PostOfficialVM; postId: string; preview: boolean }) {
  const { t } = useApp();
  const posted = official.status === "posted";
  const link = preview ? null : official.link;
  return (
    <View testID={`post-official-${postId}`} style={[styles.official, posted ? styles.officialPosted : null]}>
      <View accessible accessibilityLabel={official.feeLabel ? `${official.label}, ${official.feeLabel}` : official.label} style={styles.officialText}>
        <Txt variant="small" bold style={posted ? styles.officialPostedLabel : styles.officialLabel}>
          📣 {official.label}
        </Txt>
        {official.feeLabel ? (
          <Txt variant="small" tone="muted">
            {official.feeLabel}
          </Txt>
        ) : null}
      </View>
      {link ? (
        <Pressable
          testID={`post-official-link-${postId}`}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          accessibilityHint={t("mobile.opensExternal")}
          onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
          style={({ pressed }) => [styles.officialLink, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Txt variant="small" bold style={styles.officialLinkText}>
            {link.label} ↗
          </Txt>
        </Pressable>
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
  const [markOpen, setMarkOpen] = useState(false);
  const isPr = post.kind === "pr";
  const showMeta = post.dateLabel !== "" || (post.mine && !preview);

  const serif = newsSerif(locale);
  return (
    <View testID={testID}>
      <View style={[styles.news, isPr ? styles.ad : null, post.mine && !preview ? styles.mine : null]}>
        {/* 신문 기사(#48): 칸 머리 → 헤드라인 → 기업과 퀘스트 → (수상이면 동상) → 글쓴이 → 본문 */}
        <Text style={[styles.kicker, isPr ? styles.kickerAd : null]}>{post.kicker}</Text>
        <Text style={[styles.headline, isPr ? styles.headlineAd : null, { fontFamily: serif }]} accessibilityRole="header">
          {post.headline}
        </Text>
        {post.subhead ? <Text style={[styles.subhead, { fontFamily: serif }]}>{post.subhead}</Text> : null}
        {post.statue ? <Statue testID={`post-statue-${post.id}`} statue={post.statue} locale={locale} /> : null}
        <View style={styles.head}>
          {isPr ? <CompanyAvatar emoji={post.avatar} accent={post.avatarColor ?? COLORS.primary} size={AVATAR_SIZE} /> : <InitialAvatar letter={post.avatar} />}
          <View style={styles.headText}>
            {/* 기업 글: 회사 이름·확인 표시 옆에 SDGs 실천 마크(#35) — 이름이 길면 다음 줄로 내려가요 */}
            <View style={styles.nameRow}>
              <Txt bold numberOfLines={1} style={styles.name} accessibilityLabel={post.verified ? `${post.authorName}, ${t("mobile.companyVerified")}` : undefined}>
                {post.authorName}
                {post.verified ? " ✓" : ""}
              </Txt>
              {post.companyMark ? <CertMarkButton testID={`post-mark-${post.id}`} mark={post.companyMark} open={markOpen} onToggle={() => setMarkOpen((open) => !open)} /> : null}
            </View>
            <Txt variant="small" tone="muted" numberOfLines={1}>
              {post.authorMeta}
            </Txt>
          </View>
          <Badge tone={isPr ? "warning" : "primary"} label={post.chipLabel} />
        </View>
        {post.companyMark && markOpen ? <CertMarkDetail testID={`post-mark-note-${post.id}`} mark={post.companyMark} /> : null}

        {/* 자랑 글의 본문 = 본인의 한마디(인용), 홍보 글의 본문 = 광고 글 */}
        {post.body !== "" ? (
          post.achievement ? (
            <View style={styles.quote}>
              <Text style={styles.quoteLabel}>{t("news.comment")}</Text>
              <Text selectable style={[styles.body, { fontFamily: serif }]}>
                {post.body}
              </Text>
            </View>
          ) : (
            <Text selectable style={[styles.body, { fontFamily: serif }]}>
              {post.body}
            </Text>
          )
        ) : null}

        {post.achievement ? <Achievement testID={`post-achievement-${post.id}`} achievement={post.achievement} /> : null}

        {post.sdgIds.length > 0 ? (
          <View accessible accessibilityLabel={post.sdgIds.map((id) => sdgLabel(id, locale)).join(", ")}>
            <SdgMiniRow ids={post.sdgIds} />
          </View>
        ) : null}

        {post.official ? <Official official={post.official} postId={post.id} preview={preview} /> : null}

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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: SPACE.sm + 2 },
  headText: { flex: 1, gap: 1 },
  nameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.xs + 2 },
  name: { flexShrink: 1 },
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
  // #48 신문 기사 · 광고 칸
  news: { gap: SPACE.sm, padding: SPACE.md + 2, backgroundColor: NEWS.paper, borderWidth: 1, borderColor: NEWS.rule },
  ad: { backgroundColor: NEWS.ad, borderWidth: 3, borderColor: NEWS.ink },
  mine: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  kicker: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 1, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, color: NEWS.paper, backgroundColor: NEWS.ink },
  kickerAd: { color: NEWS.adTagText, backgroundColor: NEWS.adTag },
  headline: { fontSize: 22, fontWeight: "900", lineHeight: 30, color: NEWS.ink },
  headlineAd: { fontSize: 18, lineHeight: 25 },
  subhead: { paddingBottom: 6, fontSize: 13, fontWeight: "700", lineHeight: 20, color: NEWS.sub, borderBottomWidth: 1, borderBottomColor: NEWS.rule, borderStyle: "dashed" },
  statue: { flexDirection: "row", alignItems: "flex-end", gap: 14, padding: SPACE.md, backgroundColor: "#E9DFC8", borderWidth: 1, borderColor: NEWS.rule },
  statueImg: { width: 80, height: 112 },
  plaque: { flex: 1, gap: 2, paddingBottom: 6 },
  plaqueCaption: { fontSize: 11, fontWeight: "900", letterSpacing: 3, color: NEWS.sub },
  plaqueAward: { fontSize: 17, fontWeight: "900" },
  plaqueLine: { fontSize: 11, fontWeight: "700", lineHeight: 17, color: NEWS.ink },
  quote: { gap: 2, paddingLeft: SPACE.md, borderLeftWidth: 3, borderLeftColor: NEWS.ink },
  quoteLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: NEWS.sub },
  body: { fontSize: 15, lineHeight: 26, color: NEWS.ink },
  record: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  recordKind: { fontSize: 11, fontWeight: "800", color: NEWS.sub },
  recordAward: { fontSize: 11, fontWeight: "800", color: "#8A5E00" },
  official: { gap: SPACE.xs, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.warningSoft },
  officialPosted: { backgroundColor: COLORS.primarySoft },
  officialText: { gap: 2 },
  // 예정(광고·게시료) 안내는 웹과 같은 주황 계열, 게시된 뒤의 안내는 기본 색 — 연한 바탕 위에서 글자 대비가 4.5:1 이상인 짙은 색
  officialLabel: { color: COLORS.warning },
  officialPostedLabel: { color: COLORS.primaryDark },
  officialLink: { alignSelf: "flex-start", minHeight: HIT, justifyContent: "center" },
  officialLinkText: { color: COLORS.primaryDark, textDecorationLine: "underline" },
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
