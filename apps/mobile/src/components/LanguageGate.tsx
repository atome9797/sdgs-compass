// 맨 처음 화면: 언어 선택. 아직 언어를 고르기 전이라 제목·안내를 일본어와 한국어로 위아래에 함께 보여 줘요.
// 기기 언어에 맞는 쪽(detected)이 미리 강조되지만, 사람이 직접 누르기 전에는 아무것도 정해지지 않아요.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LOCALE_NAMES, LOCALES, type Locale, type LocalizedText } from "@sdgs-compass/core/i18n";
import { LANGUAGE_PICKER, MESSAGES } from "@sdgs-compass/core/messages";
import { Txt, type TextVariant } from "@/components/ui";
import { COLORS, FONT_SIZE, RADIUS, SPACE } from "@/theme";

function Bilingual({ text, variant, tone = "text", bold = false }: { text: LocalizedText; variant: TextVariant; tone?: "text" | "muted"; bold?: boolean }) {
  return (
    <View style={styles.bilingual}>
      <Txt variant={variant} tone={tone} bold={bold} center>
        {text.ja}
      </Txt>
      <Txt variant={variant} tone={tone} bold={bold} center>
        {text.ko}
      </Txt>
    </View>
  );
}

export interface LanguageGateProps {
  /** 기기 언어로 알아낸 언어 — 미리 강조만 해요 */
  detected: Locale;
  onSelect: (locale: Locale) => void;
}

export function LanguageGate({ detected, onSelect }: LanguageGateProps) {
  const suggested = MESSAGES["mobile.langSuggested"];
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji} accessible={false}>
        🧭
      </Text>
      <View accessibilityRole="header" style={styles.titleWrap}>
        <Bilingual text={LANGUAGE_PICKER.title} variant="display" bold />
      </View>
      <Bilingual text={LANGUAGE_PICKER.subtitle} variant="body" tone="muted" />
      <View style={styles.buttons}>
        {LOCALES.map((locale) => {
          const isSuggested = locale === detected;
          return (
            <Pressable
              key={locale}
              testID={`language-${locale}`}
              accessibilityRole="button"
              accessibilityLabel={isSuggested ? `${LOCALE_NAMES[locale]}, ${suggested[locale]}` : LOCALE_NAMES[locale]}
              onPress={() => onSelect(locale)}
              style={({ pressed }) => [
                styles.button,
                isSuggested ? styles.buttonSuggested : styles.buttonPlain,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: isSuggested ? COLORS.onPrimary : COLORS.primary }]}>{LOCALE_NAMES[locale]}</Text>
              {isSuggested ? <Text style={styles.suggested}>{suggested[locale]}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <Bilingual text={LANGUAGE_PICKER.note} variant="small" tone="muted" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: SPACE.lg, paddingTop: SPACE.xl },
  emoji: { fontSize: 72 },
  titleWrap: { alignSelf: "stretch" },
  bilingual: { alignSelf: "stretch", gap: 2 },
  buttons: { alignSelf: "stretch", gap: SPACE.md, marginTop: SPACE.sm },
  button: {
    minHeight: 76,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: SPACE.lg,
  },
  buttonSuggested: { backgroundColor: COLORS.primary },
  buttonPlain: { backgroundColor: COLORS.card },
  buttonLabel: { fontSize: FONT_SIZE.xxl, fontWeight: "800" },
  suggested: { fontSize: FONT_SIZE.sm, fontWeight: "600", color: COLORS.onPrimary, textAlign: "center" },
});
