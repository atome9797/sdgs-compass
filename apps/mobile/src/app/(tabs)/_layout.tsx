// 학생·개인(B2C)의 아래 탭: 홈 · 검색 · 마이 임팩트 · 메시지(읽지 않은 수 배지) · 설정 (순서·이름은 src/lib/tabs.ts).
import { useMemo } from "react";
import { selectInbox } from "@sdgs-compass/core/selectors";
import { AppTabs } from "@/components/AppTabs";
import { RoleGuard } from "@/components/RoleGuard";
import { useApp } from "@/lib/AppProvider";
import { B2C_TABS } from "@/lib/tabs";

export default function StudentTabsLayout() {
  const { demo, locale } = useApp();
  const unread = useMemo(() => selectInbox(demo, locale).unreadCount, [demo, locale]);
  return (
    <RoleGuard area="b2c">
      <AppTabs tabs={B2C_TABS} badges={{ messages: unread }} />
    </RoleGuard>
  );
}
