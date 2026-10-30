// 모든 화면 위의 머리글: 앱 이름 + 데모 배지, 언어 전환(日本語 | 한국어), 이용 유형 전환 알약.
// 첫 화면(언어 선택, variant="brand")에서는 아직 언어를 고르기 전이라 두 언어를 함께 쓰고 전환 단추는 숨겨요.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LOCALE_NAMES, LOCALES } from "@sdgs-compass/core/i18n";
import { MESSAGES } from "@sdgs-compass/core/messages";
import { Badge, Segmented } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { otherRole } from "@/lib/routes";
import { COLORS, FONT_SIZE, RADIUS, SPACE } from "@/theme";

const LANGUAGE_OPTIONS = LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }));

export function AppHeader({ variant = "full" }: { variant?: "full" | "brand" }) {
  const { app, t, dispatch } = useApp();
  const bilingual = variant === "brand";
  const name = bilingual ? MESSAGES["app.name"].ja : t("app.name");
  const demo = bilingual ? `${MESSAGES["app.demoBadge"].ja} / ${MESSAGES["app.demoBadge"].ko}` : t("app.demoBadge");
  const role = app.role;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Text style={styles.emoji} accessible={false}>
            🧭
          </Text>
          <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
            {name}
          </Text>
        </View>
        {bilingual ? null : (
          <Segmented
            compact
            options={LANGUAGE_OPTIONS}
            value={app.locale ?? "ja"}
            onChange={(locale) => dispatch({ type: "setLocale", locale })}
            accessibilityLabel={t("mobile.headerLanguage")}
          />
        )}
      </View>
      <View style={styles.row}>
        <Badge tone="warning" label={demo} accessibilityLabel={bilingual ? demo : `${t("app.demoBadge")}: ${t("app.demoNote")}`} />
        {!bilingual && role !== null ? (
          <Pressable
            testID="role-switch"
            accessibilityRole="button"
            accessibilityLabel={t("mobile.roleSwitchLabel", { current: t(role === "b2c" ? "role.b2c" : "role.b2b"), target: t(role === "b2c" ? "role.b2b" : "role.b2c") })}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            onPress={() => dispatch({ type: "setRole", role: otherRole(role) })}
            style={({ pressed }) => [styles.rolePill, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.roleText} numberOfLines={1}>
              {role === "b2c" ? "🎓" : "🏢"} {t(role === "b2c" ? "role.b2c" : "role.b2b")}
            </Text>
            <Text style={styles.roleSwap}>⇄</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: SPACE.sm + 2, gap: SPACE.xs + 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm },
  brand: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, flexShrink: 1 },
  emoji: { fontSize: FONT_SIZE.xl },
  name: { fontSize: FONT_SIZE.lg, fontWeight: "800", color: COLORS.text, flexShrink: 1 },
  rolePill: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs + 2,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    flexShrink: 1,
  },
  roleText: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: COLORS.primaryDark, flexShrink: 1 },
  roleSwap: { fontSize: FONT_SIZE.md, fontWeight: "800", color: COLORS.primaryDark },
});
