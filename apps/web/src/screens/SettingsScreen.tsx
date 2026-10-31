"use client";

// 설정: 언어 · 역할 전환(데모) · 스카우트 수신 안내 · 데모 초기화 · 앱 정보(샘플 데이터 안내)
import { useState } from "react";
import { CERT_DISCLAIMER } from "@sdgs-compass/core/certification";
import type { Role } from "@sdgs-compass/core/domain";
import { LOCALE_NAMES, LOCALES, pick } from "@sdgs-compass/core/i18n";
import { selectImpact } from "@sdgs-compass/core/selectors";
import { Banner, Button, Card, ScreenHead, Section } from "@/components/ui";
import { APP_VERSION, REPO_URL } from "@/lib/meta";
import { useSession } from "@/lib/session";

export function SettingsScreen() {
  const { app, demo, locale, role, t, dispatch, reset } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const other: Role = role === "b2c" ? "b2b" : "b2c";

  const doReset = async () => {
    setBusy(true);
    await reset();
  };

  return (
    <div className={role === "b2c" ? "screen" : "stack stack--lg"}>
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

      <Section title={t("settings.role")} hint={t("settings.roleNote")}>
        <div>
          <Button variant="secondary" onClick={() => dispatch({ type: "setRole", role: other })}>
            {other === "b2c" ? `🎓 ${t("settings.switchToB2c")}` : `🏢 ${t("settings.switchToB2b")}`}
          </Button>
        </div>
      </Section>

      {role === "b2c" ? (
        <Section title={t("web.settings.scout")}>
          <Card>
            <p className="small">{selectImpact(demo, locale).scoutNote}</p>
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
