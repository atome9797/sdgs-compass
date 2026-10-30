// 인재 스카우트(F-601·602): 검색·SDG 필터 → 학생 카드 → 제안 메시지(초안이 미리 채워져 있어요) → 보내기.
// 기업은 하루에 3건까지, 같은 학생에게는 한 번만 보낼 수 있어요. 보낸 스카우트는 학생 화면의 "메시지"에 도착해요.
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ScoutKind } from "@sdgs-compass/core/domain";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectSdgTiles, selectTalent, type CandidateVM } from "@sdgs-compass/core/selectors";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Screen, ScreenTitle } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { SdgMiniRow, SdgPicker } from "@/components/SdgTile";
import { Badge, Button, Card, Empty, Field, Notice, Section, Segmented, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { toggleSdg } from "@/lib/newChallenge";
import { candidateState, DEFAULT_SCOUT_KIND, SCOUT_KIND_KEY, SCOUT_KINDS } from "@/lib/scoutForm";
import { nowIso } from "@/lib/time";
import { COLORS, SPACE } from "@/theme";

function ScoutForm({ candidate, onSent, onCancel }: { candidate: CandidateVM; onSent: () => void; onCancel: () => void }) {
  const { t, dispatch } = useApp();
  const [kind, setKind] = useState<ScoutKind>(DEFAULT_SCOUT_KIND);
  const [message, setMessage] = useState(candidate.suggestedMessage);
  const [tried, setTried] = useState(false);
  const missing = message.trim() === "";

  const send = () => {
    setTried(true);
    if (missing) return;
    dispatch({ type: "sendScout", candidateId: candidate.id, kind, message, at: nowIso() });
    onSent();
  };

  return (
    <View style={styles.stack}>
      <Section title={t("talent.kind")}>
        <Segmented options={SCOUT_KINDS.map((value) => ({ value, label: t(SCOUT_KIND_KEY[value]) }))} value={kind} onChange={setKind} accessibilityLabel={t("talent.kind")} />
      </Section>
      <Field
        testID={`scout-message-${candidate.id}`}
        label={t("talent.compose")}
        value={message}
        onChangeText={setMessage}
        multiline
        error={tried && missing ? t("mobile.messageRequired") : null}
      />
      <Button testID={`scout-send-${candidate.id}`} icon="✉️" label={t("talent.send")} onPress={send} />
      <Button variant="ghost" label={t("common.cancel")} onPress={onCancel} />
    </View>
  );
}

function CandidateCard({
  candidate,
  composing,
  onCompose,
  onSent,
  onCancel,
}: {
  candidate: CandidateVM;
  composing: boolean;
  onCompose: () => void;
  onSent: () => void;
  onCancel: () => void;
}) {
  const { t } = useApp();
  const state = candidateState(candidate);
  return (
    <Card>
      <View style={styles.who}>
        <CompanyAvatar emoji={Array.from(candidate.nickname)[0] ?? "🎓"} accent={COLORS.primary} size={44} />
        <View style={styles.whoTexts}>
          <Txt variant="heading">{candidate.nickname}</Txt>
          <Txt variant="small" tone="muted">
            {candidate.university} · {candidate.faculty}
          </Txt>
        </View>
        <Badge tone="primary" label={candidate.levelLabel} />
      </View>
      <View style={styles.badges}>
        <Txt variant="small" bold>
          {candidate.pointsLabel}
        </Txt>
        <Txt variant="small" tone="muted">
          · {candidate.awardsLabel}
        </Txt>
        {candidate.isDemoStudent ? <Badge tone="warning" label={t("mobile.talentDemoStudent")} /> : null}
      </View>
      <SdgMiniRow ids={candidate.sdgIds} />
      <View style={styles.badges}>
        {candidate.skills.map((skill) => (
          <Badge key={skill} label={skill} />
        ))}
      </View>
      <Txt variant="small">{candidate.bio}</Txt>

      {state === "notScoutable" ? (
        <Badge label={t("talent.notScoutable")} />
      ) : state === "alreadySent" ? (
        <Badge tone="success" label={`✓ ${t("talent.alreadySent")}`} />
      ) : composing ? (
        <ScoutForm candidate={candidate} onSent={onSent} onCancel={onCancel} />
      ) : (
        <Button testID={`scout-${candidate.id}`} small icon="✉️" label={t("talent.propose")} disabled={state === "limit"} onPress={onCompose} />
      )}
    </Card>
  );
}

export function TalentScreen() {
  const { demo, locale, t } = useApp();
  const [query, setQuery] = useState("");
  const [sdgIds, setSdgIds] = useState<SdgId[]>([]);
  const [composingId, setComposingId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const vm = useMemo(() => selectTalent(demo, locale, { query, sdgIds }), [demo, locale, query, sdgIds]);

  return (
    <Screen tabbed testID="screen-talent">
      <ScreenTitle title={t("talent.title")} />

      <SearchBox testID="talent-search" value={query} onChangeText={setQuery} placeholder={t("talent.searchPlaceholder")} />
      <Section title={t("talent.filterSdg")}>
        <SdgPicker tiles={tiles} locale={locale} selected={sdgIds} onToggle={(id) => setSdgIds((current) => toggleSdg(current, id, tiles.length))} />
      </Section>

      <View style={styles.quota}>
        <Txt bold accessibilityLiveRegion="polite" style={styles.quotaText}>
          {vm.quotaLabel}
        </Txt>
        <Txt variant="small" tone="muted">
          {t("mobile.talentCount", { count: vm.candidates.length })}
        </Txt>
      </View>
      {vm.remaining === 0 ? <Notice testID="scout-limit" tone="warning" message={t("talent.limitReached")} /> : null}
      {sent ? <Notice testID="scout-sent" tone="success" message={t("talent.sentOk")} /> : null}

      {vm.candidates.length === 0 ? (
        <Empty testID="talent-empty">{t("talent.empty")}</Empty>
      ) : (
        vm.candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            composing={composingId === candidate.id}
            onCompose={() => {
              setSent(false);
              setComposingId(candidate.id);
            }}
            onSent={() => {
              setSent(true);
              setComposingId(null);
            }}
            onCancel={() => setComposingId(null)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.md },
  who: { flexDirection: "row", alignItems: "center", gap: SPACE.md },
  whoTexts: { flex: 1, gap: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACE.xs + 2 },
  quota: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm },
  quotaText: { flexShrink: 1 },
});
