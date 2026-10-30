// 하단 탭·사이드바 항목 정의 (역할별). 어느 탭이 켜져 있는지는 순수 함수로 정해요.
import type { Role } from "@sdgs-compass/core/domain";
import type { MessageKey } from "@sdgs-compass/core/messages";
import { normalizePath, ROUTES, stripBasePath, type RoutePath } from "./routes";

export interface NavItem {
  id: string;
  path: RoutePath;
  icon: string;
  labelKey: MessageKey;
  /** 이 탭이 "켜진 상태"로 보여야 하는 화면들 (정확히 같은 경로) */
  match: readonly string[];
}

export const B2C_TABS: readonly NavItem[] = [
  { id: "home", path: ROUTES.home, icon: "🏠", labelKey: "nav.home", match: [ROUTES.home, ROUTES.challenge, ROUTES.submit] },
  { id: "search", path: ROUTES.search, icon: "🔎", labelKey: "nav.search", match: [ROUTES.search] },
  { id: "impact", path: ROUTES.impact, icon: "📊", labelKey: "nav.impact", match: [ROUTES.impact, ROUTES.certificate, ROUTES.share] },
  { id: "messages", path: ROUTES.messages, icon: "✉️", labelKey: "nav.messages", match: [ROUTES.messages] },
  { id: "settings", path: ROUTES.settings, icon: "⚙️", labelKey: "nav.settings", match: [ROUTES.settings] },
];

export const B2B_TABS: readonly NavItem[] = [
  { id: "dashboard", path: ROUTES.b2b, icon: "📋", labelKey: "nav.dashboard", match: [ROUTES.b2b, ROUTES.b2bNew] },
  { id: "applicants", path: ROUTES.b2bApplicants, icon: "👥", labelKey: "nav.applicants", match: [ROUTES.b2bApplicants] },
  { id: "talent", path: ROUTES.b2bTalent, icon: "🧭", labelKey: "nav.talent", match: [ROUTES.b2bTalent] },
  { id: "esg", path: ROUTES.b2bEsg, icon: "🌱", labelKey: "nav.esg", match: [ROUTES.b2bEsg] },
  { id: "settings", path: ROUTES.b2bSettings, icon: "⚙️", labelKey: "nav.settings", match: [ROUTES.b2bSettings] },
];

export const tabsFor = (role: Role): readonly NavItem[] => (role === "b2b" ? B2B_TABS : B2C_TABS);

/** 지금 주소에서 켜져 있어야 하는 탭의 id (없으면 null) */
export function activeTabId(tabs: readonly NavItem[], pathname: string, basePath = ""): string | null {
  const path = normalizePath(stripBasePath(pathname, basePath));
  return tabs.find((tab) => tab.match.includes(path))?.id ?? null;
}
