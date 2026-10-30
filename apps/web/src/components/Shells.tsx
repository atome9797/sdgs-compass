"use client";

// 역할별 화면 틀: 학생 = 휴대폰 폭 한 줄 + 하단 탭, 기업 = 1024px 이상이면 왼쪽 사이드바 + 넓은 본문, 그보다 좁으면 하단 탭.
import type { ReactNode } from "react";
import { selectInbox } from "@sdgs-compass/core/selectors";
import { B2B_TABS, B2C_TABS } from "@/lib/nav";
import { useSession } from "@/lib/session";
import { Brand, TopBar } from "./TopBar";
import { SideNav, TabBar } from "./TabBar";

function SkipLink() {
  const { t } = useSession();
  return (
    <a className="skip-link" href="#main">
      {t("web.skip")}
    </a>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  const { demo, locale } = useSession();
  const unread = selectInbox(demo, locale).unreadCount;
  return (
    <div className="phone">
      <SkipLink />
      <TopBar />
      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>
      <TabBar items={B2C_TABS} badges={{ messages: unread }} />
    </div>
  );
}

export function B2bShell({ children }: { children: ReactNode }) {
  const { t } = useSession();
  return (
    <div className="b2b-shell">
      <SkipLink />
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Brand />
        </div>
        <SideNav items={B2B_TABS} />
        <p className="sidebar__foot">{t("app.demoNote")}</p>
      </aside>
      <div className="b2b-main">
        <TopBar />
        <main id="main" className="page" tabIndex={-1}>
          {children}
        </main>
        <TabBar items={B2B_TABS} variant="b2b" />
      </div>
    </div>
  );
}
