// ESG 리포트(F-403)·SDGs 실천 마크: 6개 문항(수치 + 증빙 제출 여부) → 점수·별(★5 만점 · 0.5 단위, #35)·다음 반 개까지 → 리포트 생성.
// 증빙 자료를 제출하지 않은 항목은 점수에 들어가지 않아요(core/certification.ts). 마크는 UN 공식 인증이 아니라는 안내를 항상 함께 보여 줘요.
// 별 그림(가득·반·빈)은 늘 숫자(★2.5)와 함께, 스크린 리더에는 점수와 「SDGs取組みマーク 5段階中2.5」로 읽혀요.
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { clampCertValue, type EsgCategory } from "@sdgs-compass/core/certification";
import { selectB2bDashboard, selectEsg, type CertItemVM, type EsgVM } from "@sdgs-compass/core/selectors";
import { StarRow } from "@/components/CertMark";
import { Screen, ScreenTitle } from "@/components/Screen";
import { Badge, Button, Card, Divider, Empty, Field, LabeledSwitch, Notice, ProgressBar, Section, Segmented, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { categoryRatio, isFlagItem, targetParams } from "@/lib/esg";
import { digitsOnly } from "@/lib/forms";
import { nowIso } from "@/lib/time";
import { ESG_COLORS, SPACE } from "@/theme";

/** 영역별 막대 색 = core 의 ESG_COLORS(웹과 같아요 — 메인 색 초록과 겹치지 않게 그래프 색에서 골랐어요). 값은 항상 숫자로도 보여 줘요 */
const CATEGORY_COLOR: Record<EsgCategory, string> = ESG_COLORS;

function CategoryBars({ vm }: { vm: EsgVM }) {
  return (
    <View style={styles.stack}>
      {vm.byCategory.map((category) => (
        <View key={category.key} style={styles.categoryRow}>
          <Txt variant="small" style={styles.categoryLabel} numberOfLines={2}>
            {category.label}
          </Txt>
          <View style={styles.categoryBar}>
            <ProgressBar ratio={categoryRatio(category.score)} color={CATEGORY_COLOR[category.key]} accessibilityLabel={category.label} valueText={String(category.score)} />
          </View>
          <Txt bold style={styles.categoryNum}>
            {category.score}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function CriterionCard({ item }: { item: CertItemVM }) {
  const { t, dispatch } = useApp();
  const [text, setText] = useState(String(item.value));
  const target = targetParams(item);

  const changeValue = (raw: string) => {
    const digits = digitsOnly(raw, 9);
    if (digits === "") {
      setText("");
      dispatch({ type: "setCertAnswer", id: item.id, value: 0 });
      return;
    }
    // 범위를 넘으면 가장 가까운 값으로 맞춰요 (칸의 글자도 함께)
    const value = clampCertValue(item.id, Number(digits));
    setText(String(value));
    dispatch({ type: "setCertAnswer", id: item.id, value });
  };

  return (
    <Card>
      {isFlagItem(item) ? (
        <>
          <View style={styles.criterionHead}>
            <Txt bold style={styles.criterionLabel}>
              {item.label}
            </Txt>
            <Badge tone="primary" label={item.pointsLabel} />
          </View>
          <Segmented
            options={[
              { value: "0", label: t("mobile.esgFlagOff") },
              { value: "1", label: t("mobile.esgFlagOn") },
            ]}
            value={item.value >= 1 ? "1" : "0"}
            onChange={(value) => dispatch({ type: "setCertAnswer", id: item.id, value: Number(value) })}
            accessibilityLabel={item.label}
          />
        </>
      ) : (
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Field
              testID={`esg-${item.id}`}
              label={item.label}
              counter={item.pointsLabel}
              value={text}
              onChangeText={changeValue}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={9}
            />
          </View>
          <View style={styles.unitWrap}>
            <Txt tone="muted" bold>
              {item.unitLabel}
            </Txt>
          </View>
        </View>
      )}
      <LabeledSwitch
        testID={`esg-evidence-${item.id}`}
        label={t("esg.evidence")}
        value={item.evidence}
        onValueChange={(evidence) => dispatch({ type: "setCertAnswer", id: item.id, evidence })}
      />
      {target ? (
        <Txt variant="small" tone="muted">
          {t("mobile.esgTarget", target)}
        </Txt>
      ) : null}
    </Card>
  );
}

/** 점수 + 별: 「53 / 100  ★★⯨☆☆ ★2.5」 — 한 덩어리로 「達成度 53/100, SDGs取組みマーク 5段階中2.5」라고 읽혀요 */
function ScoreLine({ vm, testID }: { vm: EsgVM; testID: string }) {
  return (
    <View style={styles.scoreLine} accessible accessibilityLabel={`${vm.scoreLabel}, ${vm.markLabel}`}>
      <Txt variant="display" testID={testID}>
        {vm.total}
      </Txt>
      <Txt tone="muted">/ 100</Txt>
      <View style={styles.mark}>
        <StarRow testID={`${testID}-stars`} icons={vm.starIcons} size={22} />
        <Txt variant="heading" tone="primary" testID={`${testID}-mark`}>
          {vm.starsLabel}
        </Txt>
      </View>
    </View>
  );
}

export function EsgScreen() {
  const { demo, locale, t, dispatch } = useApp();
  const vm = useMemo(() => selectEsg(demo, locale), [demo, locale]);
  const companyName = useMemo(() => selectB2bDashboard(demo, locale).companyName, [demo, locale]);

  return (
    <Screen tabbed testID="screen-esg">
      <ScreenTitle title={t("esg.title")} />

      <Card>
        <Txt variant="small" tone="muted">
          {t("esg.certTitle")}
        </Txt>
        <ScoreLine vm={vm} testID="esg-total" />
        <Txt variant="small" bold testID="esg-next">
          {vm.nextLabel}
        </Txt>
        <Txt variant="small" tone="muted">
          {t("esg.certShown")}
        </Txt>
        <Txt variant="small" tone="muted" bold>
          {t("mobile.esgCategories")}
        </Txt>
        <CategoryBars vm={vm} />
        <Txt variant="small" tone="muted">
          {t("esg.certFlow")}
        </Txt>
      </Card>

      <Notice testID="esg-disclaimer" tone="info" message={vm.disclaimer} />
      {vm.needEvidence ? <Notice tone="warning" message={t("esg.needEvidence")} /> : null}

      <Section title={t("mobile.esgCriteria")}>
        {vm.items.map((item) => (
          <CriterionCard key={item.id} item={item} />
        ))}
      </Section>

      <Section title={t("esg.reportTitle")}>
        <Button testID="esg-generate" icon="📄" label={t("esg.generate")} onPress={() => dispatch({ type: "generateEsg", at: nowIso() })} />
        {vm.generated ? (
          <Card>
            <View testID="esg-report" accessibilityLabel={t("esg.reportTitle")} style={styles.stack}>
              <Txt variant="small" tone="muted">
                {companyName}
              </Txt>
              <Txt variant="title" accessibilityRole="header">
                {t("esg.reportTitle")}
              </Txt>
              <Txt variant="small" tone="muted">
                {vm.generatedLabel}
              </Txt>
              <ScoreLine vm={vm} testID="esg-report-total" />
              <Txt variant="small" tone="muted" bold>
                {t("mobile.esgCategories")}
              </Txt>
              <CategoryBars vm={vm} />
              <Divider />
              <Txt variant="small" tone="muted" bold>
                {t("esg.highlights")}
              </Txt>
              {vm.highlights.map((line) => (
                <Txt key={line}>• {line}</Txt>
              ))}
              <Txt variant="small" tone="muted">
                {vm.disclaimer}
              </Txt>
            </View>
          </Card>
        ) : (
          <Empty testID="esg-empty">{t("mobile.esgReportHint")}</Empty>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.sm },
  scoreLine: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: SPACE.sm },
  mark: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, alignSelf: "center" },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  categoryLabel: { width: 96 },
  categoryBar: { flex: 1 },
  categoryNum: { width: 32, textAlign: "right" },
  criterionHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: SPACE.sm },
  criterionLabel: { flex: 1 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACE.sm },
  inputWrap: { flex: 1 },
  unitWrap: { height: 48, minWidth: 28, justifyContent: "center" },
});
