// SNS 글쓰기: 학생은 자랑 글(F-503) — 내 실적 1건을 골라 붙이고 200자 이내로 쓰기, 기업은 홍보 글(F-504) — 제목·본문·SDGs·챌린지 연결·공식 SNS 게시 신청.
// 검사는 core 의 validatePostDraft 가 하고(리듀서도 같은 검사를 한 번 더 해요), "올리기"를 한 번 눌러 본 뒤부터 칸마다 오류가 보여요. 글자 수는 입력하는 동안 바로 보여요.
// 카드뉴스 화면의 "피드에도 올리기"는 ?activity=실적, 응모자 화면의 "홍보하기"는 ?challenge=챌린지 를 붙여서 이 화면을 열고, 그 값을 미리 골라요.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PostKind } from "@sdgs-compass/core/domain";
import { authorRole, postContext, postErrorText, validatePostDraft } from "@sdgs-compass/core/post";
import { selectComposer, selectSdgTiles } from "@sdgs-compass/core/selectors";
import { OptionRow } from "@/components/OptionRow";
import { PostCard } from "@/components/PostCard";
import { Screen } from "@/components/Screen";
import { SdgMiniRow, SdgPicker } from "@/components/SdgTile";
import { Button, Empty, Field, LabeledSwitch, Notice, Section, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { paramText, postedHref, ROUTES } from "@/lib/nav";
import {
  counterOf,
  errorsByField,
  initialPostForm,
  pickChallenge,
  pickOfficialChannel,
  previewPost,
  selectedOfficialOption,
  toPostDraft,
  toggleFormSdg,
  type PostField,
  type PostFormState,
} from "@/lib/postForm";
import { nowIso } from "@/lib/time";
import { SPACE } from "@/theme";

export function PostComposerScreen({ kind }: { kind: PostKind }) {
  const { demo, locale, t, dispatch } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams();
  const activityParam = paramText(params.activity);
  const challengeParam = paramText(params.challenge);
  const vm = useMemo(
    () => selectComposer(demo, locale, kind, kind === "brag" ? { activityId: activityParam === "" ? null : activityParam } : { challengeId: challengeParam === "" ? null : challengeParam }),
    [demo, locale, kind, activityParam, challengeParam],
  );
  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const [form, setForm] = useState<PostFormState>(() => initialPostForm(vm));
  const [tried, setTried] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // "올리는 중" 표시(submitted)는 다시 그린 뒤에야 바뀌어서, 그 전에 한 번 더 들어온 누름은 ref 로 막아요
  const sending = useRef(false);

  const update = (patch: Partial<PostFormState>) => setForm((current) => ({ ...current, ...patch }));
  const draft = toPostDraft(form);
  const errors = validatePostDraft(draft, postContext(demo));
  const byField = errorsByField(errors, form);
  const errorText = (field: PostField): string | null => {
    const error = tried ? byField[field] : undefined;
    return error === undefined ? null : postErrorText(error, kind, locale);
  };
  const body = counterOf(form.body, vm.bodyLimit);
  const title = counterOf(form.title, vm.titleLimit);
  const activity = vm.activities.find((a) => a.id === form.activityId) ?? null;

  const submit = () => {
    // 같은 단추를 연달아 눌러도 한 번만 올라가요 (화면이 넘어가는 동안 다시 눌릴 수 있어서)
    if (sending.current) return;
    setTried(true);
    if (errors.length > 0) return;
    sending.current = true;
    setSubmitted(true);
    // 화면에 보여 준 채널·예정일을 피드의 안내로 넘겨요 (reducer 도 같은 규칙으로 같은 날짜를 배정해요)
    const option = kind === "pr" && form.requestOfficial ? selectedOfficialOption(vm, form) : null;
    dispatch({ type: "createPost", draft, at: nowIso() });
    router.navigate(postedHref(authorRole(kind), option ? { on: option.nextDate, channel: option.id } : null));
  };

  // 올릴 실적이 하나도 없으면 글을 쓸 수 없어요 — 챌린지에 먼저 응모하도록 안내해요
  if (kind === "brag" && vm.activities.length === 0) {
    return (
      <Screen backTitle={vm.title} testID="screen-post-new">
        <Empty testID="post-no-activity">{t("post.noActivity")}</Empty>
        <Button testID="post-find-challenge" icon="🔎" label={t("nav.search")} onPress={() => router.navigate(ROUTES.search)} />
      </Screen>
    );
  }

  return (
    <Screen backTitle={vm.title} testID="screen-post-new">
      <View style={styles.author} accessible accessibilityLabel={`${t("post.postAs", { name: vm.author.name })}, ${vm.author.meta}`}>
        <Txt bold>{t("post.postAs", { name: vm.author.name })}</Txt>
        <Txt variant="small" tone="muted">
          {vm.author.meta}
        </Txt>
      </View>

      {kind === "brag" ? (
        <>
          <Section title={t("post.activityLabel")} hint={t("post.activityHint")}>
            <View style={styles.stack}>
              {vm.activities.map((option) => (
                <OptionRow key={option.id} testID={`post-activity-${option.id}`} title={option.label} selected={option.id === form.activityId} onPress={() => update({ activityId: option.id })} />
              ))}
            </View>
            {errorText("activity") ? (
              <Txt variant="small" tone="danger" accessibilityLiveRegion="polite">
                {errorText("activity")}
              </Txt>
            ) : null}
          </Section>

          {activity ? (
            <Section title={t("post.sdgLabel")} hint={t("post.sdgAuto")}>
              <SdgMiniRow ids={activity.sdgIds} size={32} />
            </Section>
          ) : null}
        </>
      ) : (
        <Field
          testID="post-title"
          label={t("post.titleLabel")}
          value={form.title}
          onChangeText={(next) => update({ title: next })}
          placeholder={t("post.titlePlaceholder")}
          counter={t("post.counter", { count: title.count, max: vm.titleLimit })}
          counterOver={title.over}
          error={errorText("title")}
        />
      )}

      <Field
        testID="post-body"
        label={t("post.bodyLabel")}
        value={form.body}
        onChangeText={(next) => update({ body: next })}
        placeholder={vm.bodyPlaceholder}
        multiline
        counter={t("post.counter", { count: body.count, max: vm.bodyLimit })}
        counterOver={body.over}
        error={errorText("body")}
      />

      {kind === "pr" ? (
        <>
          <Section
            title={t("post.sdgLabel")}
            right={
              <Txt variant="small" tone="muted" bold>
                {form.sdgIds.length}/{vm.maxSdgs}
              </Txt>
            }
          >
            <SdgPicker tiles={tiles} locale={locale} selected={form.sdgIds} max={vm.maxSdgs} onToggle={(id) => setForm((current) => toggleFormSdg(current, id))} />
            {errorText("sdgs") ? (
              <Txt variant="small" tone="danger" accessibilityLiveRegion="polite">
                {errorText("sdgs")}
              </Txt>
            ) : null}
          </Section>

          <Section title={t("post.challengeLabel")}>
            <View style={styles.stack}>
              <OptionRow testID="post-challenge-none" title={t("post.challengeNone")} selected={form.challengeId === null} onPress={() => setForm((current) => pickChallenge(current, null, vm))} />
              {vm.challenges.map((option) => (
                <OptionRow
                  key={option.id}
                  testID={`post-challenge-${option.id}`}
                  title={option.title}
                  selected={option.id === form.challengeId}
                  onPress={() => setForm((current) => pickChallenge(current, option.id, vm))}
                />
              ))}
            </View>
            {errorText("challenge") ? (
              <Txt variant="small" tone="danger" accessibilityLiveRegion="polite">
                {errorText("challenge")}
              </Txt>
            ) : null}
          </Section>

          <View style={styles.stack}>
            <LabeledSwitch testID="post-official" label={t("post.officialLabel")} hint={vm.official.hint} value={form.requestOfficial} onValueChange={(requestOfficial) => update({ requestOfficial })} />
            {form.requestOfficial ? (
              <Section title={t("post.officialChannelLabel")}>
                <View accessibilityRole="radiogroup" accessibilityLabel={t("post.officialChannelLabel")} style={styles.stack}>
                  {vm.official.channels.map((option) => (
                    <OptionRow
                      key={option.id}
                      testID={`post-official-channel-${option.id}`}
                      title={option.label}
                      subtitle={option.nextDateLabel}
                      subtitleLines={2}
                      selected={option.id === form.officialChannel}
                      onPress={() => setForm((current) => pickOfficialChannel(current, option.id, vm))}
                    />
                  ))}
                </View>
                {errorText("official") ? (
                  <Txt variant="small" tone="danger" accessibilityLiveRegion="polite">
                    {errorText("official")}
                  </Txt>
                ) : null}
              </Section>
            ) : null}
          </View>
        </>
      ) : null}

      <Section title={t("post.preview")}>
        <PostCard testID="post-preview" post={previewPost(vm, form, t)} preview />
      </Section>

      <Txt variant="small" tone="muted">
        🔒 {vm.privacyNote}
      </Txt>

      {tried && errors.length > 0 ? (
        <Notice testID="post-errors" tone="danger" title={t("mobile.errorsTitle")}>
          {errors.map((code) => (
            <Txt key={code} variant="small" tone="danger">
              • {postErrorText(code, kind, locale)}
            </Txt>
          ))}
        </Notice>
      ) : null}

      <Button testID="post-submit" icon="✍️" label={t("post.submit")} busy={submitted} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  author: { gap: 2 },
  stack: { gap: SPACE.md },
});
