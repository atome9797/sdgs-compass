"use client";

// 앱 입구: 스플래시(불러오는 중) → 언어 선택(처음 한 번) → 역할 선택(학생/기업) → 화면.
// 고른 값은 저장돼서 다음부터는 건너뛰고, 설정이나 헤더에서 언제든 바꿀 수 있어요.
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@sdgs-compass/core/domain";
import { detectLocale, LOCALE_NAMES, LOCALES, pick, type Locale } from "@sdgs-compass/core/i18n";
import { LANGUAGE_PICKER, makeT, translate } from "@sdgs-compass/core/messages";
import { guardRedirect } from "@/lib/routes";
import { useBoot } from "@/lib/session";
import { Splash } from "./Splash";
import { LangToggle } from "./TopBar";

const LOCALE_GLYPH: Record<Locale, string> = { ja: "あ", ko: "가" };

function LanguageGate() {
  const { dispatch, resetNotice, clearResetNotice } = useBoot();
  // 브라우저 언어를 보고 한쪽을 미리 강조만 해요 (선택을 대신하지는 않아요)
  const [suggested] = useState<Locale>(() => detectLocale(typeof navigator === "undefined" ? [] : navigator.languages));
  const choose = (locale: Locale) => {
    clearResetNotice();
    dispatch({ type: "setLocale", locale });
  };
  return (
    <main className="gate" id="main">
      <div className="gate__card">
        {resetNotice ? (
          <p className="gate__persona" role="status">
            <span lang="ja">{translate("settings.resetDone", "ja")}</span> / <span lang="ko">{translate("settings.resetDone", "ko")}</span>
          </p>
        ) : null}
        <div className="gate__logo" aria-hidden="true">
          🧭
        </div>
        <p className="gate__brand">
          <span lang="ja">{translate("app.name", "ja")}</span> · <span lang="ko">{translate("app.name", "ko")}</span>
        </p>
        <div className="gate__titles">
          <h1 className="gate__title" lang="ja">
            {LANGUAGE_PICKER.title.ja}
          </h1>
          <p className="gate__title gate__title--ko" lang="ko">
            {LANGUAGE_PICKER.title.ko}
          </p>
        </div>
        <div className="stack--sm stack">
          <p className="gate__sub" lang="ja">
            {LANGUAGE_PICKER.subtitle.ja}
          </p>
          <p className="gate__sub gate__sub--ko" lang="ko">
            {LANGUAGE_PICKER.subtitle.ko}
          </p>
        </div>
        <div className="gate__choices" role="group" aria-label={`${LANGUAGE_PICKER.title.ja} / ${LANGUAGE_PICKER.title.ko}`}>
          {LOCALES.map((code) => (
            <button key={code} type="button" lang={code} className={code === suggested ? "choice choice--suggested" : "choice"} onClick={() => choose(code)}>
              <span className="choice__icon" aria-hidden="true">
                {LOCALE_GLYPH[code]}
              </span>
              <span className="choice__main">
                <span className="choice__label">{LOCALE_NAMES[code]}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="gate__note">
          <span lang="ja">{LANGUAGE_PICKER.note.ja}</span>
          <span lang="ko">{LANGUAGE_PICKER.note.ko}</span>
        </p>
      </div>
    </main>
  );
}

function RoleGate({ locale }: { locale: Locale }) {
  const { app, dispatch } = useBoot();
  const t = makeT(locale);
  const demo = app?.demo;
  const company = demo?.companies.find((c) => c.id === demo.myCompanyId);
  const choices: { role: Role; icon: string; label: string; desc: string; persona: string }[] = [
    { role: "b2c", icon: "🎓", label: t("role.b2c"), desc: t("role.b2cDesc"), persona: demo ? t("role.persona", { name: demo.me.nickname }) : "" },
    { role: "b2b", icon: "🏢", label: t("role.b2b"), desc: t("role.b2bDesc"), persona: company ? t("role.persona", { name: pick(company.name, locale) }) : "" },
  ];
  return (
    <main className="gate" id="main">
      <div className="gate__card">
        <div className="gate__logo" aria-hidden="true">
          🧭
        </div>
        <div className="gate__titles">
          <h1 className="gate__title">{t("role.title")}</h1>
        </div>
        <p className="gate__sub">{t("role.subtitle")}</p>
        <div className="gate__choices">
          {choices.map((choice) => (
            <button key={choice.role} type="button" className="choice" onClick={() => dispatch({ type: "setRole", role: choice.role })}>
              <span className="choice__icon" aria-hidden="true">
                {choice.icon}
              </span>
              <span className="choice__main">
                <span className="choice__label">{choice.label}</span>
                <span className="choice__desc">{choice.desc}</span>
                {choice.persona ? <span className="small muted">{choice.persona}</span> : null}
              </span>
            </button>
          ))}
        </div>
        <LangToggle />
        <p className="gate__note">{t("app.demoNote")}</p>
      </div>
    </main>
  );
}

/** 게이트를 지난 뒤에는 역할에 맞지 않는 주소(학생이 /b2b/ 로 등)를 알맞은 홈으로 돌려보내요 */
export function Gate({ children }: { children: ReactNode }) {
  const { app } = useBoot();
  const pathname = usePathname();
  const router = useRouter();
  // usePathname() 은 basePath 가 빠진 값이에요
  const redirect = app?.role ? guardRedirect(pathname, app.role) : null;
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (!app) return <Splash />;
  if (app.locale === null) return <LanguageGate />;
  if (app.role === null) return <RoleGate locale={app.locale} />;
  if (redirect) return <Splash />;
  return <Suspense fallback={<Splash />}>{children}</Suspense>;
}
