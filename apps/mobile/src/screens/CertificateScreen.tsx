// 디지털 증명서(F-502): 카드 + QR + 확인 코드. "진위 검증"은 내용을 다시 SHA-256 해시해 저장된 해시와 맞춰 보고,
// "위조 테스트(데모)"는 내용을 한 군데 바꾼 사본을 만들어 해시가 맞지 않는 것을 보여 줘요. QR 은 표시용 데모예요(실제 QR 인식·블록체인은 Phase 2).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { verifyCertificate } from "@sdgs-compass/core/certificate";
import { CERT_DISCLAIMER } from "@sdgs-compass/core/certification";
import { pick } from "@sdgs-compass/core/i18n";
import { certificateVM, selectCertificates, tamperedCopy } from "@sdgs-compass/core/selectors";
import { OptionRow } from "@/components/OptionRow";
import { QrView } from "@/components/QrView";
import { Screen } from "@/components/Screen";
import { SdgMiniRow } from "@/components/SdgTile";
import { Badge, Button, Empty, KeyValue, Notice, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { squareSizeFor } from "@/lib/geometry";
import { certificateHref, paramText, ROUTES } from "@/lib/nav";
import { CARD_SHADOW, COLORS, MONO_FONT, RADIUS, SPACE } from "@/theme";

function CertificateView({ id }: { id: string }) {
  const { demo, locale, t } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const certs = useMemo(() => selectCertificates(demo, locale), [demo, locale]);
  const [tampered, setTampered] = useState(false);
  /** null = 아직 검증하지 않음, true = 일치, false = 불일치 */
  const [result, setResult] = useState<boolean | null>(null);

  const base = certs.find((c) => c.cert.id === id) ?? certs[0];
  // 위조 테스트 중에는 내용을 바꾼 사본을 보여 줘요 (해시는 그대로라서 검증이 실패해요)
  const shown = useMemo(() => (base ? (tampered ? certificateVM(tamperedCopy(base.cert), locale) : base) : null), [base, tampered, locale]);

  if (!base || !shown) {
    return (
      <Screen backTitle={t("cert.title")} testID="screen-certificate-empty">
        <Empty>{t("cert.empty")}</Empty>
      </Screen>
    );
  }

  // 증명서 선택 목록은 맨 아래에 있어서, 고르면 주소를 바꿔 화면을 맨 위부터 새로 열어요 (검증·위조 테스트 상태도 처음으로)
  const select = (nextId: string) => router.replace(certificateHref(nextId));
  const verify = () => setResult(verifyCertificate(shown.cert));
  const tamper = () => {
    setTampered(true);
    setResult(verifyCertificate(tamperedCopy(base.cert)));
  };
  const restore = () => {
    setTampered(false);
    setResult(null);
  };

  return (
    <Screen backTitle={t("cert.title")} testID="screen-certificate">
      {tampered ? <Notice tone="warning" message={t("mobile.tamperedNow")} /> : null}

      <View style={[styles.cert, tampered ? styles.certTampered : null]} testID="certificate-card">
        <Badge tone={shown.awardLabel ? "warning" : "primary"} label={`${shown.awardLabel ? "🏆" : "🏅"} ${shown.kindLabel}`} />
        <Txt variant="title" accessibilityRole="header">
          {shown.challengeTitle}
        </Txt>
        <Txt variant="small" tone="muted">
          {shown.companyName}
        </Txt>
        {shown.awardLabel ? (
          <Txt bold tone="warning">
            {shown.awardLabel}
          </Txt>
        ) : null}
        <KeyValue label={t("cert.holder")} value={shown.holder} />
        <KeyValue label={t("cert.issuedOn")} value={shown.issuedOnLabel} />
        <KeyValue label={t("cert.id")} value={shown.cert.id} />
        <SdgMiniRow ids={shown.sdgIds} />
        <View style={styles.qr}>
          <QrView matrix={shown.qr} size={squareSizeFor(width, 180, 240)} accessibilityLabel={`QR ${t("cert.code")} ${shown.code}`} />
        </View>
        <View style={styles.codeBlock}>
          <Txt variant="small" tone="muted">
            {t("cert.code")}
          </Txt>
          <Txt variant="heading" selectable style={styles.mono} testID="verify-code">
            {shown.code}
          </Txt>
        </View>
        <View style={styles.codeBlock}>
          <Txt variant="small" tone="muted">
            {t("cert.hash")}
          </Txt>
          <Txt variant="caption" selectable style={styles.mono}>
            {shown.cert.hash}
          </Txt>
        </View>
      </View>

      {result === null ? null : result ? <Notice testID="verify-ok" tone="success" message={t("cert.verified")} /> : <Notice testID="verify-ng" tone="danger" message={t("cert.tampered")} />}

      <View style={styles.stack}>
        <Button testID="verify" icon="🔍" label={t("cert.verify")} onPress={verify} />
        {tampered ? (
          <Button testID="restore" variant="secondary" icon="↩" label={t("cert.restore")} onPress={restore} />
        ) : (
          <Button testID="tamper" variant="secondary" icon="🧪" label={t("cert.tamperTest")} onPress={tamper} />
        )}
      </View>
      <Button variant="ghost" icon="📣" label={t("impact.shareButton")} onPress={() => router.push(ROUTES.share)} />

      <Notice tone="info" message={t("cert.qrNote")} />
      <Txt variant="small" tone="muted" testID="cert-disclaimer">
        {pick(CERT_DISCLAIMER, locale)}
      </Txt>
      <Section title={t("cert.pick")}>
        <View style={styles.stack}>
          {certs.map((c) => (
            <OptionRow
              key={c.cert.id}
              testID={`cert-${c.cert.id}`}
              title={`${c.kindLabel} · ${c.challengeTitle}`}
              subtitle={c.issuedOnLabel}
              selected={c.cert.id === base.cert.id}
              onPress={() => select(c.cert.id)}
            />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

export function CertificateScreen() {
  const id = paramText(useLocalSearchParams().id);
  // 다른 증명서로 열면 검증 상태를 새로 시작해요
  return <CertificateView key={id} id={id} />;
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.md },
  cert: {
    gap: SPACE.sm,
    padding: SPACE.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    ...CARD_SHADOW,
  },
  certTampered: { borderColor: COLORS.danger },
  qr: { alignItems: "center", paddingVertical: SPACE.sm },
  codeBlock: { gap: 2 },
  mono: { fontFamily: MONO_FONT },
});
