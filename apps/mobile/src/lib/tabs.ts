// 아래 탭의 순서·이름·아이콘(이모지). 탭 레이아웃과 테스트가 함께 써요.
// 학생·개인(B2C): 홈 / 검색 / 마이 임팩트 / 메시지 / 설정 — 기업(B2B): 대시보드 / 응모자 / 인재 / ESG·인증 / 설정
import type { MessageKey } from "@sdgs-compass/core/messages";

export interface TabSpec {
  /** 탭 레이아웃 폴더 안의 화면 파일 이름 */
  name: string;
  labelKey: MessageKey;
  emoji: string;
}

/**
 * 탭 막대의 높이(dp). 기본(49)은 이모지와 이름이 빠듯해서 높였어요.
 * 아래 안전 영역(시스템 내비게이션 막대) 높이는 여기에 따로 더해요.
 */
export const TAB_BAR_HEIGHT = 64;

export const B2C_TABS: readonly TabSpec[] = [
  { name: "index", labelKey: "nav.home", emoji: "🏠" },
  { name: "search", labelKey: "nav.search", emoji: "🔎" },
  { name: "impact", labelKey: "nav.impact", emoji: "📊" },
  { name: "messages", labelKey: "nav.messages", emoji: "✉️" },
  { name: "settings", labelKey: "nav.settings", emoji: "⚙️" },
];

export const B2B_TABS: readonly TabSpec[] = [
  { name: "index", labelKey: "mobile.tabDashboard", emoji: "📋" },
  { name: "applicants", labelKey: "nav.applicants", emoji: "👥" },
  { name: "talent", labelKey: "nav.talent", emoji: "🧭" },
  { name: "esg", labelKey: "nav.esg", emoji: "🌱" },
  { name: "settings", labelKey: "nav.settings", emoji: "⚙️" },
];
