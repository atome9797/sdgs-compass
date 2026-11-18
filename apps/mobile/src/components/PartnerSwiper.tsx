// 첫 화면(SCR-01)의 협력 단체 배너 — 웹(components/PartnerSwiper)과 같은, Swiper 처럼 저절로 넘어가는 광고 배너.
// 5초마다 다음 장으로 넘어가고(마지막 다음은 첫 장), 손가락으로 넘길 수 있고, 아래 점을 누르면 그 장으로 가요.
// 손으로 넘기는 동안 · 멈춤 단추를 누른 뒤 · 움직임 줄이기(Reduce Motion)가 켜져 있으면 저절로 넘기지 않아요.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import type { TFunction } from "@sdgs-compass/core/messages";
import type { SdgId } from "@sdgs-compass/core/sdg";
import type { PartnerBannerVM } from "@sdgs-compass/core/selectors";
import { SdgMiniRow } from "@/components/SdgTile";
import { COLORS, FONT_SIZE, HIT, RADIUS, SPACE } from "@/theme";

/** 다음 장으로 넘어가기까지의 시간 (웹 lib/carousel 의 AUTOPLAY_MS 와 같아요) */
export const AUTOPLAY_MS = 5000;

export function PartnerSwiper({ slides, t, onOpen, testID }: { slides: readonly PartnerBannerVM[]; t: TFunction; onOpen: (sdgIds: readonly SdgId[]) => void; testID?: string }) {
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  // 처음 그릴 때는 화면 폭에서 좌우 여백을 뺀 값, 자리를 잡으면 실제 폭
  const width = measured > 0 ? measured : Math.max(0, window.width - SPACE.lg * 2);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [touching, setTouching] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const listRef = useRef<FlatList<PartnerBannerVM>>(null);
  const count = slides.length;
  const autoplay = playing && !touching && !reduceMotion && count > 1 && width > 0;

  // 움직임 줄이기 설정(읽기는 비동기) — 켜져 있으면 저절로 넘기지 않아요
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (alive) setReduceMotion(on);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => setReduceMotion(on));
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  // 저절로 넘기기: 장이 바뀔 때마다 다음 타이머를 다시 걸어요
  useEffect(() => {
    if (!autoplay) return;
    const id = setTimeout(() => {
      const next = (index + 1) % count;
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
      setIndex(next);
    }, AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [autoplay, index, count, width]);

  const goTo = (next: number) => {
    listRef.current?.scrollToOffset({ offset: next * width, animated: !reduceMotion });
    setIndex(next);
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTouching(false);
    if (width <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(count - 1, next)));
  };

  return (
    <View testID={testID} accessibilityLabel={t("home.partnersRegion")} onLayout={(event: LayoutChangeEvent) => setMeasured(event.nativeEvent.layout.width)}>
      <View style={styles.viewport}>
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(slide) => slide.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScrollBeginDrag={() => setTouching(true)}
          onScrollEndDrag={() => setTouching(false)}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item, index: i }) => (
            <Slide
              slide={item}
              width={width}
              label={t("home.partnersSlide", { index: i + 1, count })}
              sampleLabel={t("home.partnersSample")}
              ctaLabel={t("home.partnersCta")}
              onOpen={() => onOpen(item.sdgIds)}
              testID={testID ? `${testID}-slide-${item.id}` : undefined}
            />
          )}
        />
      </View>
      {count > 1 ? (
        <View style={styles.controls}>
          {slides.map((slide, i) => (
            <Pressable
              key={slide.id}
              testID={testID ? `${testID}-dot-${i}` : undefined}
              accessibilityRole="button"
              accessibilityLabel={t("home.partnersGo", { index: i + 1 })}
              accessibilityState={{ selected: i === index }}
              onPress={() => goTo(i)}
              style={styles.dotHit}
            >
              <View style={[styles.dot, i === index ? styles.dotActive : null]} />
            </Pressable>
          ))}
          {reduceMotion ? null : (
            <Pressable
              testID={testID ? `${testID}-toggle` : undefined}
              accessibilityRole="button"
              accessibilityLabel={playing ? t("home.partnersPause") : t("home.partnersPlay")}
              onPress={() => setPlaying((v) => !v)}
              style={styles.dotHit}
            >
              <Text style={styles.toggleText}>{playing ? "❚❚" : "▶"}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Slide({ slide, width, label, sampleLabel, ctaLabel, onOpen, testID }: { slide: PartnerBannerVM; width: number; label: string; sampleLabel: string; ctaLabel: string; onOpen: () => void; testID?: string }) {
  return (
    <View testID={testID} style={[styles.slide, { width, backgroundColor: slide.accent }]} accessibilityLabel={label}>
      <View style={styles.art} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>
      <View style={styles.main}>
        <View style={styles.meta}>
          <Text style={styles.name}>{slide.name}</Text>
          {slide.sample ? <Text style={styles.chip}>{sampleLabel}</Text> : null}
        </View>
        <Text style={styles.kind}>{slide.kind}</Text>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.body}>{slide.body}</Text>
        <View style={styles.foot}>
          <SdgMiniRow ids={slide.sdgIds} size={22} />
          <Pressable
            testID={testID ? `${testID}-cta` : undefined}
            accessibilityRole="button"
            accessibilityLabel={`${slide.name} ${ctaLabel}`}
            onPress={onOpen}
            style={({ pressed }) => [styles.cta, pressed ? styles.ctaPressed : null]}
          >
            <Text style={[styles.ctaText, { color: slide.accent }]}>{ctaLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { borderRadius: RADIUS.lg, overflow: "hidden" },
  slide: { flexDirection: "row", gap: 14, padding: SPACE.lg },
  art: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.16)" },
  emoji: { fontSize: 34 },
  main: { flex: 1, gap: 3 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  name: { color: COLORS.onPrimary, fontSize: FONT_SIZE.sm, fontWeight: "800" },
  chip: { color: COLORS.onPrimary, fontSize: FONT_SIZE.xs, fontWeight: "700", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.75)", borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 1 },
  kind: { color: COLORS.onPrimary, fontSize: FONT_SIZE.xs, fontWeight: "700" },
  headline: { color: COLORS.onPrimary, fontSize: FONT_SIZE.lg, fontWeight: "800", lineHeight: 24, marginTop: 2 },
  body: { color: COLORS.onPrimary, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  foot: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm, marginTop: "auto", paddingTop: 6 },
  cta: { minHeight: HIT, justifyContent: "center", paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: COLORS.card },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontSize: FONT_SIZE.sm, fontWeight: "800" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  dotHit: { minWidth: HIT, minHeight: HIT, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.textSubtle },
  dotActive: { width: 22, backgroundColor: COLORS.primary },
  toggleText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: "800" },
});
