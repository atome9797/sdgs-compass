// 기업·단체의 아래 탭 (순서·이름은 src/lib/tabs.ts).
import { AppTabs } from "@/components/AppTabs";
import { B2B_TABS } from "@/lib/tabs";

export default function B2bTabsLayout() {
  return <AppTabs tabs={B2B_TABS} />;
}
