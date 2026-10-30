"use client";

// 신규 챌린지 출제(F-201): 제목·개요·SDGs(최대 3)·상금·모집 기간(7~90일)·모집 형태·인턴십 특전
import { useMemo, useState, type FormEvent } from "react";
import { MAX_CHALLENGE_DAYS, MAX_CHALLENGE_SDGS, MIN_CHALLENGE_DAYS, validateChallengeDraft, type ChallengeDraftError } from "@sdgs-compass/core/challenge";
import type { Participation } from "@sdgs-compass/core/domain";
import type { SdgId } from "@sdgs-compass/core/sdg";
import { selectSdgTiles } from "@sdgs-compass/core/selectors";
import { SdgChips } from "@/components/sdg";
import { Banner, Button, ButtonLink, Field, ScreenHead } from "@/components/ui";
import { buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";

const DEFAULT_DAYS = 14;
const PARTICIPATIONS: readonly Participation[] = ["both", "individual", "team"];

function NewChallengeForm({ onCreated }: { onCreated: () => void }) {
  const { locale, t, dispatch } = useSession();
  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sdgIds, setSdgIds] = useState<SdgId[]>([]);
  const [prize, setPrize] = useState("100000");
  const [days, setDays] = useState(String(DEFAULT_DAYS));
  const [participation, setParticipation] = useState<Participation>("both");
  const [internship, setInternship] = useState(true);
  const [tried, setTried] = useState(false);

  const draft = { title, summary, sdgIds, prizeYen: prize.trim() === "" ? Number.NaN : Number(prize), days: days.trim() === "" ? Number.NaN : Number(days), participation, internship };
  const errors = validateChallengeDraft(draft);
  const errorText = (code: ChallengeDraftError): string | null => (tried && errors.includes(code) ? t(`new.error.${code}`) : null);
  const toggleSdg = (id: SdgId) => setSdgIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (errors.length > 0) return;
    dispatch({ type: "createChallenge", draft });
    onCreated();
  };

  const sdgError = errorText("sdgs_required");
  return (
    <form className="card card--pad stack stack--lg form-narrow" onSubmit={submit} noValidate>
      <Field label={t("new.challengeTitle")} error={errorText("title_required")}>
        {(props) => <input {...props} className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("new.titlePh")} autoComplete="off" />}
      </Field>
      <Field label={t("new.summary")} error={errorText("summary_required")}>
        {(props) => <textarea {...props} className="textarea" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={t("new.summaryPh")} />}
      </Field>
      <div className="stack stack--sm">
        <p className="field__label" id="new-sdgs">
          {t("new.sdgs")} <span className="muted">({sdgIds.length}/{MAX_CHALLENGE_SDGS})</span>
        </p>
        <SdgChips tiles={tiles} selected={sdgIds} onToggle={toggleSdg} label={t("new.sdgs")} max={MAX_CHALLENGE_SDGS} />
        {sdgError ? <p className="field__error">{sdgError}</p> : null}
      </div>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="grow" style={{ minWidth: 200 }}>
          <Field label={t("new.prize")} error={errorText("prize_invalid")}>
            {(props) => <input {...props} className="input" type="number" inputMode="numeric" min={0} step={10000} value={prize} onChange={(event) => setPrize(event.target.value)} />}
          </Field>
        </div>
        <div className="grow" style={{ minWidth: 200 }}>
          <Field label={t("new.days")} hint={t("new.error.days_invalid")} error={errorText("days_invalid")}>
            {(props) => <input {...props} className="input" type="number" inputMode="numeric" min={MIN_CHALLENGE_DAYS} max={MAX_CHALLENGE_DAYS} step={1} value={days} onChange={(event) => setDays(event.target.value)} />}
          </Field>
        </div>
      </div>
      <Field label={t("new.participation")}>
        {(props) => (
          <select {...props} className="select" value={participation} onChange={(event) => setParticipation(event.target.value as Participation)}>
            {PARTICIPATIONS.map((value) => (
              <option key={value} value={value}>
                {t(`participation.${value}`)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <label className="check">
        <input type="checkbox" checked={internship} onChange={(event) => setInternship(event.target.checked)} />
        {t("new.internship")}
      </label>
      <div>
        <Button type="submit">{t("new.submit")}</Button>
      </div>
    </form>
  );
}

export function NewChallengeScreen() {
  const { t } = useSession();
  const [createdCount, setCreatedCount] = useState(0);
  return (
    <>
      <ScreenHead title={t("new.title")} back={buildHref(ROUTES.b2b)} backLabel={t("common.back")} />
      {createdCount > 0 ? (
        <div className="stack">
          <Banner tone="success">{t("new.created")}</Banner>
          <div>
            <ButtonLink href={buildHref(ROUTES.b2b)} variant="secondary">
              {t("nav.dashboard")}
            </ButtonLink>
          </div>
        </div>
      ) : null}
      {/* 출제하면 입력 칸을 비워서(key 가 바뀌어 새로 시작) 이어서 또 출제할 수 있어요 */}
      <NewChallengeForm key={createdCount} onCreated={() => setCreatedCount((n) => n + 1)} />
    </>
  );
}
