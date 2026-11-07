"use client";

// 설정: 언어 · 역할 전환(데모 — 학생·기업·연구자) · 스카우트 받기 켜기/끄기(학생) · 연구자 프로필(연구자) · 데모 초기화 · 앱 정보(샘플 데이터 안내)
// 학생·연구자 화면(/settings/ · /lab/settings/)은 휴대폰 폭, 기업 화면(/b2b/settings/)은 넓은 틀이에요.
import { useId, useMemo, useState } from "react";
import { CERT_DISCLAIMER } from "@sdgs-compass/core/certification";
import type { Role } from "@sdgs-compass/core/domain";
import { LOCALE_NAMES, LOCALES, pick } from "@sdgs-compass/core/i18n";
import type { MessageKey } from "@sdgs-compass/core/messages";
import { selectLabProfile } from "@sdgs-compass/core/researchView";
import { selectScoutSetting } from "@sdgs-compass/core/selectors";
import { Banner, Button, Card, ScreenHead, Section, Tag } from "@/components/ui";
import { APP_VERSION, REPO_URL } from "@/lib/meta";
import { useSession } from "@/lib/session";

/** 다른 역할로 바꾸는 단추 (지금 역할은 빼요) */
const SWITCHES: readonly { role: Role; icon: string; key: MessageKey }[] = [
  { role: "b2c", icon: "🎓", key: "settings.switchToB2c" },
  { role: "b2b", icon: "🏢", key: "settings.switchToB2b" },
  { role: "researcher", icon: "🔬", key: "settings.switchToResearcher" },
];

export function SettingsScreen() {
  const { app, demo, locale, role, t, dispatch, reset } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const scout = useMemo(() => selectScoutSetting(demo, locale), [demo, locale]);
  const profile = useMemo(() => selectLabProfile(demo, locale), [demo, locale]);
  const scoutHintId = useId();

  const doReset = async () => {
    setBusy(true);
    await reset();
  };

  return (
    <div className={role === "b2b" ? "stack stack--lg" : "screen"}>
      <ScreenHead title={t("settings.title")} />

      <Section title={t("settings.language")} hint={t("settings.languageNote")}>
        <div className="chips" role="group" aria-label={t("settings.language")}>
          {LOCALES.map((code) => (
            <button key={code} type="button" lang={code} className="chip" aria-pressed={app.locale === code} onClick={() => dispatch({ type: "setLocale", locale: code })}>
              {LOCALE_NAMES[code]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("settings.role")} hint={t("web.settings.roleNote")}>
        <div className="row">
          {SWITCHES.filter((item) => item.role !== role).map((item) => (
            <Button key={item.role} variant="secondary" onClick={() => dispatch({ type: "setRole", role: item.role })}>
              {item.icon} {t(item.key)}
            </Button>
          ))}
        </div>
      </Section>

      {role === "researcher" ? (
        <Section title={t("lab.profile.title")}>
          <Card className="stack stack--sm">
            <dl className="kv">
              <dt>{t("lab.profile.name")}</dt>
              <dd>{profile.name}</dd>
              <dt>{t("lab.profile.affiliation")}</dt>
              <dd>{profile.affiliation}</dd>
              <dt>{t("lab.profile.degree")}</dt>
              <dd>{profile.degreeLabel}</dd>
              <dt>{t("lab.profile.fields")}</dt>
              <dd className="row">
                {profile.fieldLabels.map((label) => (
                  <Tag key={label}>{label}</Tag>
                ))}
              </dd>
            </dl>
            <p className="small">{profile.bio}</p>
          </Card>
        </Section>
      ) : null}

      {role === "b2c" ? (
        <Section title={t("web.settings.scout")}>
          <Card className="stack stack--sm">
            <label className="check">
              <input type="checkbox" checked={scout.enabled} aria-describedby={scoutHintId} onChange={(event) => dispatch({ type: "setScoutable", scoutable: event.target.checked })} />
              {t("settings.scoutToggle")}
            </label>
            <p id={scoutHintId} className="field__hint">
              {t("settings.scoutToggleHint")}
            </p>
            <p className="small strong" role="status">
              {scout.status} — {scout.note}
            </p>
          </Card>
        </Section>
      ) : null}

      <Section title={t("settings.resetTitle")} hint={t("settings.resetDesc")}>
        {confirming ? (
          <div className="stack">
            <Banner tone="warning">{t("web.settings.resetConfirm")}</Banner>
            <div className="row">
              <Button variant="danger" onClick={doReset} disabled={busy}>
                {t("common.reset")}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              ↺ {t("settings.resetTitle")}
            </Button>
          </div>
        )}
      </Section>

      <Section title={t("settings.about")}>
        <Card className="stack">
          <dl className="kv">
            <dt>{t("app.name")}</dt>
            <dd>{t("app.demoBadge")}</dd>
            <dt>{t("settings.version")}</dt>
            <dd>{APP_VERSION}</dd>
          </dl>
          <Banner tone="info">{t("settings.demoNotice")}</Banner>
          <p className="small">{t("settings.sampleData")}</p>
          <p className="small muted">{t("app.demoNote")}</p>
          <a className="link-more" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {t("settings.repo")} ↗
          </a>
        </Card>
      </Section>

      <Section title={t("settings.disclaimerTitle")}>
        <p className="disclaimer">{pick(CERT_DISCLAIMER, locale)}</p>
        <p className="disclaimer">{t("app.unNotice")}</p>
      </Section>
    </div>
  );
}
