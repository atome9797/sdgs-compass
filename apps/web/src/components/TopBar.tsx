"use client";

// 모든 화면 맨 위: 앱 이름 + 데모 배지, 오른쪽에 언어 토글(즉시 바뀌고 저장돼요)과 역할 전환 알약(누르면 역할 선택 화면).
import Link from "next/link";
import type { Role } from "@sdgs-compass/core/domain";
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES } from "@sdgs-compass/core/i18n";
import { makeT } from "@sdgs-compass/core/messages";
import { homeFor } from "@/lib/routes";
import { useBoot, useSession } from "@/lib/session";
import { GameTitle } from "./GameTitle";
import { BrandLogo } from "@/components/BrandLogo";

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

export const ROLE_ICON: Record<Role, string> = { b2c: "👤", b2b: "🏢", researcher: "🔬" };

/**
 * 👤 学生 ⇄ — 누르면 역할 선택 화면(학생 · 기업 · 연구자)으로 가요. 데모에서 세 쪽 흐름을 번갈아 보여 주려고 늘 머리글에 있어요.
 * 역할을 비우면(null) 게이트가 역할 선택을 보여 주고, 고르면 그 역할의 홈으로 옮겨요(guardRedirect).
 */
export function RolePill() {
  const { role, t, dispatch } = useSession();
  const label = t(`web.roleShort.${role}`);
  const text = t("web.role.switch", { role: label });
  return (
    <button type="button" className="role-pill" aria-label={text} title={text} onClick={() => dispatch({ type: "setRole", role: null })}>
      <span aria-hidden="true">{ROLE_ICON[role]}</span>
      <span className="role-pill__label">{label}</span>
      <span className="role-pill__swap" aria-hidden="true">
        ⇄
      </span>
    </button>
  );
}

/** 맨 위 제목: 게임 제목 「勇者さま、助けてください！」(#37) — 서비스 이름(SDGsコンパス)과 데모 배지는 그 아래 작게 */
export function Brand() {
  const { role, t } = useSession();
  return (
    <Link href={homeFor(role)} className="brand">
      <BrandLogo className="brand__logo" />
      <span className="brand__text">
        <span className="brand__name">
          <GameTitle text={t("app.title")} />
        </span>
        <span className="brand__sub">
          <span>{t("app.name")}</span>
          <span className="demo-badge">{t("app.demoBadge")}</span>
        </span>
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
