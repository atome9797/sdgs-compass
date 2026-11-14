"use client";

// 역할별 화면 틀: 학생·연구자 = 휴대폰 폭 한 줄 + 하단 탭, 기업 = 1024px 이상이면 왼쪽 사이드바 + 넓은 본문, 그보다 좁으면 하단 탭.
import type { ReactNode } from "react";
import { selectInbox } from "@sdgs-compass/core/selectors";
import { B2B_TABS, B2C_TABS, LAB_TABS } from "@/lib/nav";
import { useSession } from "@/lib/session";
import { QuestClearHost } from "./battle/QuestClear";
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
      {/* #47 기업이 내 기획서를 고르면(수상) 다음에 학생 화면을 열 때 퀘스트 달성 팝업 */}
      <QuestClearHost>
        <main id="main" className="main" tabIndex={-1}>
          {children}
        </main>
      </QuestClearHost>
      <TabBar items={B2C_TABS} badges={{ messages: unread }} />
    </div>
  );
}

/** 연구자(대학원생) 화면: 학생과 같은 휴대폰 폭 틀에 연구자용 하단 탭(의뢰 찾기 · 내 연구 · 설정) */
export function LabShell({ children }: { children: ReactNode }) {
  return (
    <div className="phone">
      <SkipLink />
      <TopBar />
      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>
      <TabBar items={LAB_TABS} />
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
        {/* 시제품 안내와 "UN 승인 아님" 고지(#19)를 사이드바 맨 아래에 작게 항상 보여요 */}
        <p className="sidebar__foot">
          {t("app.demoNote")}
          <br />
          {t("app.unNotice")}
        </p>
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
