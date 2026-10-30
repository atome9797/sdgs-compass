"use client";

// 운영자 화면(/admin/*)의 틀: 위쪽 줄(돌아가기 · 이름표 · 언어) + 탭(이용 현황 · SNS 지표) + 안내.
// 학생·기업 화면의 하단 탭·사이드바와는 따로 만들었고(운영자는 PC 에서 보는 일이 많아서), 역할을 고르지 않아도 열려요.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LangToggle } from "@/components/TopBar";
import { useAdmin } from "@/lib/adminSession";
import { activeTabId, ADMIN_TABS } from "@/lib/nav";
import { buildHref, ROUTES } from "@/lib/routes";

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useAdmin();
  const pathname = usePathname();
  const activeId = activeTabId(ADMIN_TABS, pathname);
  return (
    <div className="adm">
      <a className="skip-link" href="#main">
        {t("web.skip")}
      </a>
      <div className="adm-head">
        <header className="adm-top">
          <div className="adm-top__left">
            <Link href={buildHref(ROUTES.root)} className="adm-back" aria-label={t("admin.back")} title={t("admin.back")}>
              <span aria-hidden="true">←</span>
            </Link>
            <Link href={buildHref(ROUTES.admin)} className="brand">
              <span className="brand__logo" aria-hidden="true">
                🧭
              </span>
              <span className="brand__text">
                <span className="brand__name">{t("admin.brandName")}</span>
                <span className="demo-badge">{t("admin.badge")}</span>
              </span>
            </Link>
          </div>
          <LangToggle />
        </header>
        <nav className="adm-tabs" aria-label={t("admin.nav.label")}>
          {ADMIN_TABS.map((tab) => (
            <Link key={tab.id} href={buildHref(tab.path)} className="adm-tab" aria-current={activeId === tab.id ? "page" : undefined}>
              <span aria-hidden="true">{tab.icon}</span>
              {t(tab.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
      <main id="main" className="adm-main" tabIndex={-1}>
        <p className="disclaimer">{t("admin.notice")}</p>
        {children}
      </main>
    </div>
  );
}
