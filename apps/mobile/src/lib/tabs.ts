// 아래 탭의 순서·이름·아이콘(이모지). 탭 레이아웃과 테스트가 함께 써요.
// 학생·개인(B2C): 홈 / 피드 / 검색 / 마이 임팩트 / 메시지 / 설정 — 기업(B2B): 대시보드 / 피드 / 응모자 / 인재 / ESG·인증 / 설정
// 피드(SNS, F-503·F-504)는 두 쪽 모두 홈·대시보드 바로 다음이에요. 탭이 6개라서 칸이 좁아졌고, 이름은 글자 크기를 조금 줄여서 한 줄에 맞춰요(AppTabs).
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

/** 탭 이름의 글자 크기(dp)와, 칸이 좁을 때 줄어들 수 있는 최소 비율. 탭 막대 높이가 정해져 있어서 시스템 글자 크기는 따르지 않아요. */
export const TAB_LABEL_SIZE = 11;
export const TAB_LABEL_MIN_SCALE = 0.7;
/** 탭 칸 양옆 여백(dp): 줄어든 이름이 칸을 꽉 채워도 이웃한 이름과 붙어 보이지 않게 해요. 이름이 쓸 수 있는 폭 = 칸 폭 − 양옆 여백. */
export const TAB_ITEM_PADDING_X = 3;

export const B2C_TABS: readonly TabSpec[] = [
  { name: "index", labelKey: "nav.home", emoji: "🏠" },
  { name: "feed", labelKey: "nav.feed", emoji: "📰" },
  { name: "search", labelKey: "nav.search", emoji: "🔎" },
  { name: "impact", labelKey: "nav.impact", emoji: "📊" },
  { name: "messages", labelKey: "nav.messages", emoji: "✉️" },
  { name: "settings", labelKey: "nav.settings", emoji: "⚙️" },
];

export const B2B_TABS: readonly TabSpec[] = [
  { name: "index", labelKey: "mobile.tabDashboard", emoji: "📋" },
  { name: "feed", labelKey: "nav.feed", emoji: "📰" },
  { name: "applicants", labelKey: "nav.applicants", emoji: "👥" },
  { name: "talent", labelKey: "nav.talent", emoji: "🧭" },
  { name: "esg", labelKey: "nav.esg", emoji: "🌱" },
  { name: "settings", labelKey: "nav.settings", emoji: "⚙️" },
];
