"use client";

// 모든 화면 맨 위: 앱 이름 + 데모 배지, 오른쪽에 언어 토글(즉시 바뀌고 저장돼요)과 역할 전환 알약.
import Link from "next/link";
import type { Role } from "@sdgs-compass/core/domain";
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES } from "@sdgs-compass/core/i18n";
import { makeT } from "@sdgs-compass/core/messages";
import { buildHref, ROUTES } from "@/lib/routes";
import { useBoot, useSession } from "@/lib/session";

/** 日本語 | 한국어 — 게이트에서도 쓰므로 역할을 아직 몰라도 돼요 */
export function LangToggle() {
  const { app, dispatch } = useBoot();
  const locale = app?.locale ?? DEFAULT_LOCALE;
  const t = makeT(locale);
  return (
    <div className="seg" role="group" aria-label={t("web.lang.label")}>
      {LOCALES.map((code) => (
        <button key={code} type="button" lang={code} className="seg__btn" aria-pressed={locale === code} onClick={() => dispatch({ type: "setLocale", locale: code })}>
          {LOCALE_NAMES[code]}
        </button>
      ))}
    </div>
  );
}

/** 👤 学生 ⇄ — 누르면 학생 ⇄ 기업 화면으로 바뀌어요 (데모에서 두 쪽 흐름을 번갈아 보여 주려고) */
export function RolePill() {
  const { role, t, dispatch } = useSession();
  const other: Role = role === "b2c" ? "b2b" : "b2c";
  const label = t(role === "b2c" ? "web.roleShort.b2c" : "web.roleShort.b2b");
  const target = t(other === "b2c" ? "web.roleShort.b2c" : "web.roleShort.b2b");
  const text = t("web.role.switchTo", { role: target });
  return (
    <button type="button" className="role-pill" aria-label={text} title={text} onClick={() => dispatch({ type: "setRole", role: other })}>
      <span aria-hidden="true">{role === "b2c" ? "👤" : "🏢"}</span>
      <span className="role-pill__label">{label}</span>
      <span className="role-pill__swap" aria-hidden="true">
        ⇄
      </span>
    </button>
  );
}

export function Brand() {
  const { role, t } = useSession();
  return (
    <Link href={buildHref(role === "b2b" ? ROUTES.b2b : ROUTES.home)} className="brand">
      <span className="brand__logo" aria-hidden="true">
        🧭
      </span>
      <span className="brand__text">
        <span className="brand__name">{t("app.name")}</span>
        <span className="demo-badge">{t("app.demoBadge")}</span>
      </span>
    </Link>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <Brand />
      <div className="topbar__controls">
        <LangToggle />
        <RolePill />
      </div>
    </header>
  );
}
