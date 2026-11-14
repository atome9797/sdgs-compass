// 모든 화면 위의 머리글: 게임 제목(#37 「勇者さま、助けてください！」) + 서비스 이름·데모 배지, 언어 전환(日本語 | 한국어), 이용 유형 전환 알약.
// 첫 화면(언어 선택, variant="brand")에서는 아직 언어를 고르기 전이라 두 언어를 함께 쓰고 전환 단추는 숨겨요.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LOCALE_NAMES, LOCALES } from "@sdgs-compass/core/i18n";
import { MESSAGES } from "@sdgs-compass/core/messages";
import { Badge, Segmented } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { otherRole } from "@/lib/routes";
import { COLORS, FONT_SIZE, RADIUS, SPACE } from "@/theme";
import { BrandLogo } from "@/components/BrandLogo";

const LANGUAGE_OPTIONS = LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }));

export function AppHeader({ variant = "full" }: { variant?: "full" | "brand" }) {
  const { app, t, dispatch } = useApp();
  const bilingual = variant === "brand";
  const name = bilingual ? MESSAGES["app.title"].ja : t("app.title");
  const service = bilingual ? MESSAGES["app.name"].ja : t("app.name");
  const demo = bilingual ? `${MESSAGES["app.demoBadge"].ja} / ${MESSAGES["app.demoBadge"].ko}` : t("app.demoBadge");
  const role = app.role;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <BrandLogo size={30} testID="brand-logo" />
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">
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
        <View style={styles.serviceRow}>
          <Text style={styles.service} numberOfLines={1}>
            {service}
          </Text>
          <Badge tone="warning" label={demo} accessibilityLabel={bilingual ? demo : `${t("app.demoBadge")}: ${t("app.demoNote")}`} />
        </View>
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
  name: { fontSize: FONT_SIZE.lg, fontWeight: "800", color: COLORS.text, flexShrink: 1 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: SPACE.xs + 2, flexShrink: 1 },
  service: { fontSize: FONT_SIZE.xs, fontWeight: "700", color: COLORS.textMuted },
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
