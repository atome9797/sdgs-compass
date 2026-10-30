// 언어 다음 화면: 이용 유형 고르기 (학생·개인 / 기업·단체). 데모 계정 이름도 함께 알려 줘요.
// 나중에 머리글의 알약이나 설정에서 언제든 바꿀 수 있어요.
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Role } from "@sdgs-compass/core/domain";
import type { Locale } from "@sdgs-compass/core/i18n";
import { makeT } from "@sdgs-compass/core/messages";
import { Txt } from "@/components/ui";
import { CARD_SHADOW, COLORS, RADIUS, SPACE } from "@/theme";

export interface RoleGateProps {
  locale: Locale;
  /** 학생·개인 데모 계정의 이름 (예: 닉네임) */
  studentName: string;
  /** 기업·단체 데모 계정의 이름 (예: 회사 이름) */
  companyName: string;
  onSelect: (role: Role) => void;
}

export function RoleGate({ locale, studentName, companyName, onSelect }: RoleGateProps) {
  const t = makeT(locale);
  const options: { role: Role; emoji: string; title: string; desc: string; persona: string }[] = [
    { role: "b2c", emoji: "🎓", title: t("role.b2c"), desc: t("role.b2cDesc"), persona: t("role.persona", { name: studentName }) },
    { role: "b2b", emoji: "🏢", title: t("role.b2b"), desc: t("role.b2bDesc"), persona: t("role.persona", { name: companyName }) },
  ];
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Txt variant="display" accessibilityRole="header">
          {t("role.title")}
        </Txt>
        <Txt tone="muted">{t("role.subtitle")}</Txt>
      </View>
      {options.map((option) => (
        <Pressable
          key={option.role}
          testID={`role-${option.role}`}
          accessibilityRole="button"
          accessibilityLabel={`${option.title}. ${option.desc}. ${option.persona}`}
          onPress={() => onSelect(option.role)}
          style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{option.emoji}</Text>
          </View>
          <View style={styles.texts}>
            <Txt variant="heading">{option.title}</Txt>
            <Txt variant="small" tone="muted">
              {option.desc}
            </Txt>
            <Txt variant="small" tone="primary" bold>
              {option.persona}
            </Txt>
          </View>
          <Text style={styles.arrow} accessible={false}>
            ›
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.lg },
  head: { gap: SPACE.xs },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.lg,
    minHeight: 112,
    padding: SPACE.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    ...CARD_SHADOW,
  },
  emojiWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primarySoft, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 30 },
  texts: { flex: 1, gap: 2 },
  arrow: { fontSize: 32, color: COLORS.primary, fontWeight: "700" },
});
