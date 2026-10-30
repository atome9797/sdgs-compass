// 신규 챌린지 출제(F-201): 제목·개요·SDGs(최대 3)·상금·모집 기간(7~90일)·모집 형태·인턴십 특전.
// 검사는 core 의 validateChallengeDraft 가 하고, "출제하기"를 한 번 눌러 본 뒤부터 칸마다 오류가 보여요. 출제하면 학생 쪽 홈에도 바로 나타나요.
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MAX_CHALLENGE_DAYS, MAX_CHALLENGE_SDGS, MIN_CHALLENGE_DAYS, validateChallengeDraft, type ChallengeDraftError } from "@sdgs-compass/core/challenge";
import { formatYen } from "@sdgs-compass/core/format";
import { pick } from "@sdgs-compass/core/i18n";
import { selectSdgTiles } from "@sdgs-compass/core/selectors";
import { NumberField } from "@/components/NumberField";
import { Screen } from "@/components/Screen";
import { SdgPicker } from "@/components/SdgTile";
import { Button, Chip, Field, LabeledSwitch, Notice, Section, Segmented, Stepper, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { parseCount } from "@/lib/forms";
import { goBack, ROUTES } from "@/lib/nav";
import {
  CHALLENGE_ERROR_KEY,
  clampDays,
  DAY_PRESETS,
  emptyChallengeForm,
  PARTICIPATION_OPTIONS,
  toChallengeDraft,
  toggleSdg,
  type NewChallengeForm,
} from "@/lib/newChallenge";
import { SAMPLE_CHALLENGE } from "@/lib/samples";
import { SPACE } from "@/theme";

function ChallengeForm({ onCreated }: { onCreated: () => void }) {
  const { locale, t, dispatch } = useApp();
  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const [form, setForm] = useState<NewChallengeForm>(emptyChallengeForm);
  const [tried, setTried] = useState(false);

  const update = (patch: Partial<NewChallengeForm>) => setForm((current) => ({ ...current, ...patch }));
  const draft = toChallengeDraft(form);
  const errors = validateChallengeDraft(draft);
  const errorText = (code: ChallengeDraftError): string | null => (tried && errors.includes(code) ? t(CHALLENGE_ERROR_KEY[code]) : null);
  const prize = parseCount(form.prizeText);

  const fillSample = () =>
    update({
      title: pick(SAMPLE_CHALLENGE.title, locale),
      summary: pick(SAMPLE_CHALLENGE.summary, locale),
      sdgIds: SAMPLE_CHALLENGE.sdgIds,
    });

  const submit = () => {
    setTried(true);
    if (errors.length > 0) return;
    dispatch({ type: "createChallenge", draft });
    onCreated();
  };

  return (
    <View style={styles.form}>
      <Button testID="fill-sample" small variant="ghost" icon="✍️" label={t("mobile.fillSample")} onPress={fillSample} />

      <Field
        testID="new-title"
        label={t("new.challengeTitle")}
        value={form.title}
        onChangeText={(title) => update({ title })}
        placeholder={t("new.titlePh")}
        autoCorrect={false}
        error={errorText("title_required")}
      />
      <Field
        testID="new-summary"
        label={t("new.summary")}
        value={form.summary}
        onChangeText={(summary) => update({ summary })}
        placeholder={t("new.summaryPh")}
        multiline
        error={errorText("summary_required")}
      />

      <Section title={`${t("new.sdgs")} (${form.sdgIds.length}/${MAX_CHALLENGE_SDGS})`}>
        <SdgPicker tiles={tiles} locale={locale} selected={form.sdgIds} max={MAX_CHALLENGE_SDGS} onToggle={(id) => update({ sdgIds: toggleSdg(form.sdgIds, id) })} />
        {errorText("sdgs_required") ? (
          <Txt variant="small" tone="danger" accessibilityLiveRegion="polite">
            {errorText("sdgs_required")}
          </Txt>
        ) : null}
      </Section>

      <NumberField
        testID="new-prize"
        label={t("new.prize")}
        value={prize}
        onChangeValue={(value) => update({ prizeText: String(value) })}
        hint={formatYen(prize, locale)}
        error={errorText("prize_invalid")}
      />

      <View style={styles.days}>
        <Stepper
          testID="new-days"
          label={t("new.days")}
          value={form.days}
          min={MIN_CHALLENGE_DAYS}
          max={MAX_CHALLENGE_DAYS}
          onChange={(days) => update({ days: clampDays(days) })}
          formatValue={(days) => t("mobile.daysValue", { days })}
          decreaseLabel={t("mobile.decrease")}
          increaseLabel={t("mobile.increase")}
          hint={errorText("days_invalid") ?? t("mobile.daysRange", { min: MIN_CHALLENGE_DAYS, max: MAX_CHALLENGE_DAYS })}
        />
        <View style={styles.presets}>
          {DAY_PRESETS.map((days) => (
            <Chip key={days} kind="radio" label={t("mobile.daysValue", { days })} selected={form.days === days} onPress={() => update({ days })} />
          ))}
        </View>
      </View>

      <Section title={t("new.participation")}>
        <Segmented
          options={PARTICIPATION_OPTIONS.map((value) => ({ value, label: t(`participation.${value}`) }))}
          value={form.participation}
          onChange={(participation) => update({ participation })}
          accessibilityLabel={t("new.participation")}
        />
      </Section>

      <LabeledSwitch testID="new-internship" label={t("new.internship")} value={form.internship} onValueChange={(internship) => update({ internship })} />

      {tried && errors.length > 0 ? (
        <Notice tone="danger" title={t("mobile.errorsTitle")}>
          {errors.map((code) => (
            <Txt key={code} variant="small" tone="danger">
              • {t(CHALLENGE_ERROR_KEY[code])}
            </Txt>
          ))}
        </Notice>
      ) : null}

      <Button testID="new-submit" label={t("new.submit")} onPress={submit} />
    </View>
  );
}

export function NewChallengeScreen() {
  const { t } = useApp();
  const router = useRouter();
  const [created, setCreated] = useState(false);
  // 한 번 더 출제할 때 입력 칸을 비우려고 key 를 바꿔요
  const [round, setRound] = useState(0);

  return (
    <Screen backTitle={t("new.title")} testID="screen-new-challenge">
      {created ? (
        <View style={styles.form}>
          <Notice testID="new-created" tone="success" message={t("new.created")} />
          <Button testID="go-dashboard" label={t("mobile.goToDashboard")} onPress={() => goBack(router, ROUTES.b2bDashboard)} />
          <Button
            testID="new-another"
            variant="secondary"
            icon="＋"
            label={t("b2b.newChallenge")}
            onPress={() => {
              setCreated(false);
              setRound((value) => value + 1);
            }}
          />
        </View>
      ) : (
        <ChallengeForm key={round} onCreated={() => setCreated(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACE.lg },
  days: { gap: SPACE.sm },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
});
