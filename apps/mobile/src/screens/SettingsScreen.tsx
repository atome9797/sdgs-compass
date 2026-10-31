// 설정(학생·기업 공용): 언어 · 이용 유형 전환(데모) · 스카우트 수신 안내(학생) · 데모 초기화 · 앱 정보(샘플 데이터 안내) · 인증마크 유의 사항.
// 언어·유형은 바꾸는 즉시 저장돼요. 데모 초기화는 경고창 대신 화면 안에서 한 번 더 확인해요.
import { useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { CERT_DISCLAIMER } from "@sdgs-compass/core/certification";
import { LOCALE_NAMES, LOCALES, pick } from "@sdgs-compass/core/i18n";
import { selectImpact } from "@sdgs-compass/core/selectors";
import { Screen, ScreenTitle } from "@/components/Screen";
import { Button, Card, KeyValue, Notice, Section, Segmented, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { APP_VERSION, REPO_URL } from "@/lib/meta";
import { otherRole } from "@/lib/routes";
import { SPACE } from "@/theme";

const LANGUAGE_OPTIONS = LOCALES.map((code) => ({ value: code, label: LOCALE_NAMES[code] }));

export function SettingsScreen() {
  const { app, demo, locale, t, dispatch, resetAll } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = app.role;
  const scoutNote = useMemo(() => selectImpact(demo, locale).scoutNote, [demo, locale]);

  const doReset = async () => {
    setBusy(true);
    setError(null);
    try {
      // 끝나면 언어 선택 화면으로 돌아가요 (이 화면은 사라지므로 성공했을 때는 상태를 되돌리지 않아요)
      await resetAll();
    } catch {
      setBusy(false);
      setError(t("error.generic"));
    }
  };

  const openRepo = async () => {
    setError(null);
    try {
      await Linking.openURL(REPO_URL);
    } catch {
      setError(t("error.generic"));
    }
  };

  return (
    <Screen tabbed testID="screen-settings">
      <ScreenTitle title={t("settings.title")} />

      <Section title={t("settings.language")} hint={t("settings.languageNote")}>
        <Segmented options={LANGUAGE_OPTIONS} value={locale} onChange={(code) => dispatch({ type: "setLocale", locale: code })} accessibilityLabel={t("settings.language")} />
      </Section>

      {role === null ? null : (
        <Section title={t("settings.role")} hint={t("settings.roleNote")}>
          <Button
            testID="switch-role"
            variant="secondary"
            icon={role === "b2c" ? "🏢" : "🎓"}
            label={role === "b2c" ? t("settings.switchToB2b") : t("settings.switchToB2c")}
            onPress={() => dispatch({ type: "setRole", role: otherRole(role) })}
          />
        </Section>
      )}

      {role === "b2c" ? (
        <Section title={t("mobile.scoutSetting")}>
          <Card>
            <Txt variant="small">{scoutNote}</Txt>
          </Card>
        </Section>
      ) : null}

      <Section title={t("settings.resetTitle")} hint={t("settings.resetDesc")}>
        {confirming ? (
          <View style={styles.stack}>
            <Notice tone="warning" message={t("mobile.resetConfirm")} />
            <Button testID="reset-confirm" variant="danger" icon="↺" label={t("common.reset")} busy={busy} onPress={doReset} />
            <Button testID="reset-cancel" variant="secondary" label={t("common.cancel")} disabled={busy} onPress={() => setConfirming(false)} />
          </View>
        ) : (
          <Button testID="reset-start" variant="secondary" icon="↺" label={t("settings.resetTitle")} onPress={() => setConfirming(true)} />
        )}
      </Section>

      {error ? <Notice testID="settings-error" tone="danger" message={error} /> : null}

      <Section title={t("settings.about")}>
        <Card>
          <KeyValue label={t("app.name")} value={t("app.demoBadge")} />
          <KeyValue label={t("settings.version")} value={APP_VERSION} />
          <Notice tone="info" message={t("settings.demoNotice")} />
          <Txt variant="small">{t("settings.sampleData")}</Txt>
          <Txt variant="small" tone="muted">
            {t("app.demoNote")}
          </Txt>
          <Button testID="open-repo" variant="ghost" small label={`${t("settings.repo")} ↗`} onPress={openRepo} />
        </Card>
      </Section>

      <Section title={t("settings.disclaimerTitle")}>
        <Txt variant="small" tone="muted" testID="settings-disclaimer">
          {pick(CERT_DISCLAIMER, locale)}
        </Txt>
        <Txt variant="small" tone="muted" testID="settings-un-notice">
          {t("app.unNotice")}
        </Txt>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.md },
});
