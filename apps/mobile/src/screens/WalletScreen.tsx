// #25 リワード残高(데모): 잔액 · 입출금 내역 · 본인 확인(데모 버튼) · 출금 신청 · 고지 ①~④ (늘 보여요). 웹 /wallet/ 과 같은 화면 모델(core walletView)을 그려요.
// 운영사가 第二種資金移動業 등록을 받은 뒤에 제공할 기능이라, 실제 송금·eKYC 는 하지 않아요. 설계는 docs/rewards.md.
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { parseYenInput } from "@sdgs-compass/core/wallet";
import { checkWithdrawal, selectWallet, type WalletEntryVM } from "@sdgs-compass/core/walletView";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, Empty, Field, Notice, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { nowIso } from "@/lib/time";
import { COLORS, SPACE } from "@/theme";

function EntryRow({ entry, first }: { entry: WalletEntryVM; first: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={[entry.kindLabel, entry.title, entry.dateLabel, entry.amountLabel, entry.statusLabel ?? ""].filter(Boolean).join(", ")}
      style={[styles.row, first ? null : styles.rowDivider]}
      testID={`wallet-entry-${entry.id}`}
    >
      <View style={styles.rowTop}>
        <Badge label={`${entry.emoji} ${entry.kindLabel}`} tone={entry.credit ? "success" : "neutral"} />
        {entry.statusLabel ? <Badge label={entry.statusLabel} tone="warning" /> : null}
        <Txt bold tone={entry.credit ? "success" : "text"} style={styles.amount}>
          {entry.amountLabel}
        </Txt>
      </View>
      <Txt bold numberOfLines={3}>
        {entry.title}
      </Txt>
      <Txt variant="small" tone="muted">
        {entry.dateLabel}
      </Txt>
    </View>
  );
}

export function WalletScreen() {
  const { demo, locale, t, dispatch } = useApp();
  const vm = useMemo(() => selectWallet(demo, locale), [demo, locale]);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = () => {
    const amount = parseYenInput(raw);
    const problem = checkWithdrawal(demo, amount, locale);
    setError(problem);
    if (problem !== null || amount === null) {
      setDone(false);
      return;
    }
    dispatch({ type: "requestWithdrawal", amountYen: amount, at: nowIso() });
    setRaw("");
    setDone(true);
  };

  return (
    <Screen backTitle={t("wallet.title")} testID="screen-wallet">
      {/* 고지 ① — 등록 전에는 제공하지 않는 기능이라는 것을 맨 위에 늘 보여요 */}
      <Notice tone="info" message={vm.notices.registration} testID="wallet-notice-registration" />

      <Card>
        <View style={styles.rowTop}>
          <Txt variant="small" tone="muted">
            {t("wallet.balance")}
          </Txt>
          <Badge label={t("wallet.demo")} tone="warning" />
        </View>
        <Txt variant="display" testID="wallet-balance">
          {vm.balanceLabel}
        </Txt>
        <Txt variant="small" tone="muted">
          {vm.totalsLabel}
        </Txt>
      </Card>

      <Section title={t("wallet.history")}>
        {vm.entries.length === 0 ? (
          <Empty>{t("wallet.historyEmpty")}</Empty>
        ) : (
          <Card>
            {vm.entries.map((entry, index) => (
              <EntryRow key={entry.id} entry={entry} first={index === 0} />
            ))}
          </Card>
        )}
      </Section>

      <Section title={t("wallet.kyc.title")} hint={t("wallet.kyc.hint")}>
        <Card>
          <Txt bold testID="wallet-kyc">
            {vm.kycVerified ? "✅ " : ""}
            {vm.kycLabel}
          </Txt>
          {!vm.kycVerified ? <Button testID="wallet-kyc-button" variant="secondary" icon="🪪" label={t("wallet.kyc.button")} onPress={() => dispatch({ type: "verifyKyc", at: nowIso() })} /> : null}
        </Card>
      </Section>

      <Section title={t("wallet.withdraw.title")} hint={vm.notices.kyc}>
        <Card>
          {!vm.kycVerified ? (
            <Txt variant="small" tone="muted">
              {t("wallet.withdraw.needKyc")}
            </Txt>
          ) : null}
          <Field
            label={t("wallet.withdraw.amount")}
            hint={t("wallet.withdraw.hint", { balance: vm.balanceLabel, max: vm.maxLabel })}
            error={error}
            value={raw}
            editable={vm.kycVerified}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="10000"
            maxLength={12}
            onChangeText={(text) => {
              setRaw(text);
              setError(null);
              setDone(false);
            }}
            testID="wallet-amount"
          />
          <Button testID="wallet-withdraw" icon="🏦" label={t("wallet.withdraw.submit")} disabled={!vm.kycVerified} onPress={submit} />
          {done ? <Notice tone="success" message={t("wallet.withdraw.done")} testID="wallet-withdraw-done" /> : null}
        </Card>
      </Section>

      <Section title={t("wallet.about.title")}>
        <Card>
          <Txt variant="small">🏆 {t("wallet.about.prize")}</Txt>
          <Txt variant="small">🤝 {t("wallet.about.return")}</Txt>
          <Txt variant="small">🔒 {t("wallet.about.noBuy")}</Txt>
        </Card>
      </Section>

      {/* 고지 ①~④ — 순서대로 늘 보여요 (① 은 맨 위에도) */}
      <Section title={t("wallet.noticesTitle")}>
        <View style={styles.notices} testID="wallet-notices">
          {[vm.notices.registration, vm.notices.kyc, vm.notices.tax, vm.notices.level].map((text, index) => (
            <Notice key={index} tone="warning" message={text} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACE.xs + 2, paddingVertical: SPACE.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  rowTop: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACE.xs + 2 },
  amount: { marginLeft: "auto" },
  notices: { gap: SPACE.sm },
});
