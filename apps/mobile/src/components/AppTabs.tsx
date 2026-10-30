// 아래 탭 막대 (학생·개인과 기업·단체가 함께 써요): 이모지 아이콘 + 이름, 읽지 않은 메시지 수 배지.
// 탭 이름·순서는 lib/tabs.ts, 탭마다의 화면 파일은 이 막대를 쓰는 레이아웃 폴더 안에 있어요. JS 탭(expo-router/js-tabs)을 써요 (SchedulAI 와 같은 방식).
// 탭 막대 높이를 정하면 아래 안전 영역(시스템 내비게이션 막대)을 막대가 더하지 않아서 직접 더해요.
import { Tabs } from "expo-router/js-tabs";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/lib/AppProvider";
import { TAB_BAR_HEIGHT, type TabSpec } from "@/lib/tabs";
import { COLORS } from "@/theme";

export interface AppTabsProps {
  tabs: readonly TabSpec[];
  /** 탭 이름(TabSpec.name) → 배지에 붙일 수. 0 이면 붙이지 않아요 */
  badges?: Readonly<Record<string, number | undefined>>;
}

export function AppTabs({ tabs, badges = {} }: AppTabsProps) {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border, height: TAB_BAR_HEIGHT + insets.bottom },
        // 탭 단추는 아이콘·이름을 위에서부터 쌓아요: 높인 만큼 조금 내려서 가운데쯤에
        tabBarIconStyle: { marginTop: 4 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      {tabs.map((tab) => {
        const label = t(tab.labelKey);
        const count = badges[tab.name] ?? 0;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: label,
              tabBarBadge: count > 0 ? (count > 9 ? "9+" : count) : undefined,
              tabBarAccessibilityLabel: count > 0 ? t("mobile.tabsUnread", { label, count }) : label,
              tabBarIcon: ({ focused }) => (
                <Text accessible={false} style={{ fontSize: 22, opacity: focused ? 1 : 0.7 }}>
                  {tab.emoji}
                </Text>
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
