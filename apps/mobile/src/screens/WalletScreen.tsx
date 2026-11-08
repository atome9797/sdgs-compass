// 「受け取った賞金」(데모): 받은 합계 · 받은 기록(기업 상금 · 운영사 특별상) · 받을 수 있는 돈의 구조 · 고지 ①~③ (늘 보여요). 웹 /wallet/ 과 같은 화면 모델(core walletView)을 그려요.
// 상금은 기업이 수상 팀에 직접 전액 지급하고, 운영사는 돈을 맡지 않아요(2026-11-08 직접 지급 모델) — 그래서 잔액·출금은 없어요. 설계는 docs/fees.md.
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { selectWallet, type WalletEntryVM } from "@sdgs-compass/core/walletView";
import { Screen } from "@/components/Screen";
import { Badge, Card, Empty, Notice, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { COLORS, SPACE } from "@/theme";

function EntryRow({ entry, first }: { entry: WalletEntryVM; first: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={[entry.kindLabel, entry.title, entry.dateLabel, entry.amountLabel].join(", ")}
      style={[styles.row, first ? null : styles.rowDivider]}
      testID={`wallet-entry-${entry.id}`}
    >
      <View style={styles.rowTop}>
        <Badge label={`${entry.emoji} ${entry.kindLabel}`} tone="success" />
        <Txt bold tone="success" style={styles.amount}>
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
  const { demo, locale, t } = useApp();
  const vm = useMemo(() => selectWallet(demo, locale), [demo, locale]);

  return (
    <Screen backTitle={t("wallet.title")} testID="screen-wallet">
      {/* 고지 ① — 상금은 기업이 직접 전액 지급하고 운영사는 돈을 맡지 않는다는 것을 맨 위에 늘 보여요 */}
      <Notice tone="info" message={vm.notices.direct} testID="wallet-notice-direct" />

      <Card>
        <View style={styles.rowTop}>
          <Txt variant="small" tone="muted">
            {t("wallet.total")}
          </Txt>
          <Badge label={t("wallet.demo")} tone="warning" />
        </View>
        <Txt variant="display" testID="wallet-total">
          {vm.totalLabel}
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

      <Section title={t("wallet.about.title")}>
        <Card>
          <Txt variant="small">🏆 {t("wallet.about.prize")}</Txt>
          <Txt variant="small">🤝 {t("wallet.about.return")}</Txt>
          <Txt variant="small">🔒 {t("wallet.about.noHold")}</Txt>
        </Card>
      </Section>

      {/* 고지 ①~③ — 순서대로 늘 보여요 (① 은 맨 위에도) */}
      <Section title={t("wallet.noticesTitle")}>
        <View style={styles.notices} testID="wallet-notices">
          {[vm.notices.direct, vm.notices.tax, vm.notices.level].map((text, index) => (
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
