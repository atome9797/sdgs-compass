// 화면 뼈대: 안전 영역 + 머리글(AppHeader) + (뒤로 가기 줄) + 스크롤 본문 + (아래 고정 영역).
//  - 탭 안의 화면(tabbed)은 아래 안전 영역을 탭 막대가 처리해서 본문에서는 더하지 않아요.
//  - 탭 밖의 화면(챌린지 상세 등)은 아래 안전 영역을 직접 더해요.
//  - 입력 칸이 키보드에 가리지 않게 두 플랫폼 모두 KeyboardAvoidingView(padding)를 써요. SDK 58(targetSdk 36)의 Android 는 edge-to-edge 라서
//    adjustResize 가 창 크기를 줄이지 않고 키보드 높이만 알려 주기 때문이에요(SchedulAI 와 같은 방식). 이 화면은 머리글을 직접 그려서
//    KeyboardAvoidingView 의 위쪽이 화면 맨 위 기준이라 keyboardVerticalOffset 은 0 이에요.
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { Txt } from "@/components/ui";
import { useApp } from "@/lib/AppProvider";
import { goBack } from "@/lib/nav";
import { GATE_HREF } from "@/lib/routes";
import { COLORS, FONT_SIZE, HIT, PHONE_WIDTH, SPACE } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** 머리글 모양 (첫 화면은 "brand") */
  header?: "full" | "brand";
  /** 탭 안의 화면이면 true */
  tabbed?: boolean;
  /** 주면 머리글 아래에 "‹ 뒤로" 줄이 생겨요 (제목도 함께) */
  backTitle?: string;
  /** 스크롤하지 않는 화면(true 로 두면 children 이 직접 높이를 채워요) */
  fixed?: boolean;
  /** 본문 아래에 고정되는 영역 (주요 단추) */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen({ children, header = "full", tabbed = false, backTitle, fixed = false, footer, contentStyle, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = tabbed ? 0 : insets.bottom;
  const content = [styles.content, contentStyle];
  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <View style={styles.maxWidth}>
          <AppHeader variant={header} />
        </View>
      </View>
      {backTitle !== undefined ? <BackBar title={backTitle} /> : null}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {fixed ? (
          <View style={[styles.flex, styles.maxWidth, content]}>{children}</View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: SPACE.xxl + bottomInset }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={[styles.maxWidth, content]}>{children}</View>
          </ScrollView>
        )}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: SPACE.md + bottomInset }]}>
            <View style={styles.maxWidth}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** "‹ 뒤로" + 화면 제목 줄 */
function BackBar({ title }: { title: string }) {
  const router = useRouter();
  const { t, gate } = useApp();
  const onBack = () => goBack(router, GATE_HREF[gate]);
  return (
    <View style={styles.backBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={onBack} hitSlop={8} style={styles.backButton}>
        <Text style={styles.backGlyph}>‹</Text>
        <Text style={styles.backLabel}>{t("common.back")}</Text>
      </Pressable>
      <Txt variant="heading" accessibilityRole="header" numberOfLines={1} style={styles.backTitle}>
        {title}
      </Txt>
    </View>
  );
}

/** 탭 화면 맨 위의 큰 제목 (+ 설명) */
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Txt variant="display" accessibilityRole="header">
        {title}
      </Txt>
      {subtitle ? (
        <Txt tone="muted" variant="small">
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  headerWrap: { backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: "center" },
  /** 태블릿·가로 폭이 넓은 화면에서도 본문은 휴대폰 폭으로 가운데에 */
  maxWidth: { width: "100%", maxWidth: PHONE_WIDTH },
  content: { padding: SPACE.lg, gap: SPACE.lg },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  footer: {
    alignItems: "center",
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backBar: { flexDirection: "row", alignItems: "center", gap: SPACE.sm, paddingHorizontal: SPACE.md, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: SPACE.xs, paddingRight: SPACE.sm },
  backGlyph: { fontSize: FONT_SIZE.xxl, color: COLORS.primary, lineHeight: 30, fontWeight: "700" },
  backLabel: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: "700" },
  backTitle: { flex: 1 },
  titleWrap: { gap: SPACE.xs },
});
