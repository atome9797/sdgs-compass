// 챌린지 카드: 표지(색 + 기업 이모지 + D-day) · 제목(2줄) · 기업 · SDGs 미니 타일 · 칩(상금·혜택·모집 형태).
// AI 추천 카드는 매칭률과 이유도 보여 줘요. 카드 전체가 하나의 버튼이고, 아래 footer 는 버튼 밖이에요.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { ChallengeCardVM } from "@sdgs-compass/core/selectors";
import { Cover } from "@/components/Cover";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { CARD_SHADOW, COLORS, RADIUS, SPACE } from "@/theme";

export interface ChallengeCardProps {
  card: ChallengeCardVM;
  onPress: () => void;
  /** AI 추천: 매칭률과 추천 이유를 보여요 */
  showMatch?: boolean;
  /** 카드 아래에 붙는 것 (예: 기업 화면의 "응모자 보기" 단추) */
  footer?: ReactNode;
  testID?: string;
}

export function ChallengeCard({ card, onPress, showMatch = false, footer, testID }: ChallengeCardProps) {
  const { t } = useApp();
  const prizeName = t("reward.prize");
  const label = `${card.title}, ${card.companyName}, ${card.dDay}, ${card.statusLabel}`;
  return (
    <View style={styles.shadow}>
      <View style={styles.clip}>
        <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <Cover hue={card.hue} emoji={card.companyEmoji} status={card.status} statusLabel={card.statusLabel} dDay={card.dDay} bookmarked={card.bookmarked} />
          <View style={styles.body}>
            <Txt variant="heading" numberOfLines={2}>
              {card.title}
            </Txt>
            <Txt variant="small" tone="muted" numberOfLines={1}>
              {card.companyName}
            </Txt>
            <SdgMiniRow ids={card.sdgIds} />
            <View style={styles.chips}>
              {card.prizeLabel ? <Badge tone="primary" label={`💰 ${card.prizeLabel}`} /> : null}
              {card.rewardLabels
                .filter((reward) => reward !== prizeName)
                .map((reward) => (
                  <Badge key={reward} tone="success" label={reward} />
                ))}
              <Badge label={card.participationLabel} />
            </View>
            {showMatch && card.match !== null ? (
              <View style={styles.match}>
                <Badge tone="success" label={t("home.matchRate", { rate: card.match })} />
                {card.reasons.map((reason) => (
                  <Txt key={reason} variant="small" tone="muted">
                    ✓ {reason}
                  </Txt>
                ))}
              </View>
            ) : null}
            <Txt variant="small" tone="muted">
              {card.applicantsLabel} · {t("challenge.deadline")} {card.closesOnLabel}
            </Txt>
          </View>
        </Pressable>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 그림자(바깥)와 모서리 자르기(안쪽)를 나눠야 iOS 에서 그림자가 잘리지 않아요
  shadow: { borderRadius: RADIUS.lg, backgroundColor: COLORS.card, ...CARD_SHADOW },
  clip: { borderRadius: RADIUS.lg, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  body: { padding: SPACE.lg, gap: SPACE.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.xs + 2 },
  match: { gap: SPACE.xs, backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: SPACE.md },
  footer: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg },
});
