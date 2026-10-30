// 메시지(스카우트 수신): 열면 읽음 처리, 수락/보류로 답해요. 1:1 채팅은 Phase 2 (inbox.phase2).
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { selectInbox, type InboxItemVM } from "@sdgs-compass/core/selectors";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Screen, ScreenTitle } from "@/components/Screen";
import { Badge, Button, Card, Divider, Empty, Notice, Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { COLORS, SPACE } from "@/theme";

export function MessagesScreen() {
  const { demo, locale, t, dispatch } = useApp();
  const vm = useMemo(() => selectInbox(demo, locale), [demo, locale]);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (item: InboxItemVM) => {
    const opening = openId !== item.id;
    setOpenId(opening ? item.id : null);
    // 열어 보면 읽음 처리 (탭의 읽지 않은 수 배지도 함께 줄어요)
    if (opening && item.unread) dispatch({ type: "markScoutRead", scoutId: item.id });
  };

  return (
    <Screen tabbed testID="screen-messages">
      <ScreenTitle title={t("inbox.title")} subtitle={vm.unreadCount > 0 ? `${t("inbox.unread")}: ${vm.unreadCount}` : undefined} />

      {vm.items.length === 0 ? (
        <Empty testID="inbox-empty">{t("inbox.empty")}</Empty>
      ) : (
        vm.items.map((item) => {
          const open = openId === item.id;
          return (
            <Card key={item.id}>
              <Pressable
                testID={`inbox-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={[item.title, item.kindLabel, item.dateLabel, item.unread ? t("inbox.unread") : (item.statusLabel ?? "")].filter(Boolean).join(", ")}
                accessibilityState={{ expanded: open }}
                onPress={() => toggle(item)}
                style={({ pressed }) => [styles.head, { opacity: pressed ? 0.85 : 1 }]}
              >
                <CompanyAvatar emoji={item.companyEmoji} accent={item.companyAccent} />
                <View style={styles.texts}>
                  <Txt bold numberOfLines={2}>
                    {item.title}
                  </Txt>
                  <Txt variant="small" tone="muted" numberOfLines={1}>
                    {item.kindLabel} · {item.dateLabel}
                  </Txt>
                </View>
                {item.unread ? (
                  <Badge tone="danger" label={t("inbox.unread")} />
                ) : item.statusLabel ? (
                  <Badge tone={item.status === "accepted" ? "success" : "neutral"} label={item.statusLabel} />
                ) : null}
                <Text accessible={false} style={styles.chevron}>
                  {open ? "▴" : "▾"}
                </Text>
              </Pressable>
              {open ? (
                <View style={styles.body}>
                  <Divider />
                  <Txt testID={`inbox-message-${item.id}`}>{item.message}</Txt>
                  {item.canRespond ? (
                    <View style={styles.actions}>
                      <Button testID={`inbox-accept-${item.id}`} label={t("inbox.accept")} onPress={() => dispatch({ type: "respondScout", scoutId: item.id, response: "accepted" })} />
                      <Button
                        testID={`inbox-decline-${item.id}`}
                        variant="secondary"
                        label={t("inbox.decline")}
                        onPress={() => dispatch({ type: "respondScout", scoutId: item.id, response: "declined" })}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <Notice tone="info" message={`💬 ${t("inbox.phase2")}`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: SPACE.md },
  texts: { flex: 1, gap: 2 },
  chevron: { fontSize: 16, color: COLORS.textMuted },
  body: { gap: SPACE.md },
  actions: { gap: SPACE.sm },
});
