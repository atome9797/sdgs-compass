// 앱 공통 UI 조각: 글자, 버튼, 칩, 배지, 카드, 안내 상자, 입력 칸, 구분 선택, 숫자 조절, 진행 막대.
// 색·간격·둥글기는 모두 디자인 토큰(@/theme)에서 가져오고, 누르는 곳은 최소 44dp 로 둬요.
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { CARD_SHADOW, COLORS, FONT_SIZE, HIT, RADIUS, SPACE } from "@/theme";

// ───────────── 글자 ─────────────

export type TextVariant = "display" | "title" | "heading" | "body" | "small" | "caption";
export type TextTone = "text" | "muted" | "primary" | "success" | "warning" | "danger" | "onPrimary" | "donation";

const VARIANT: Record<TextVariant, TextStyle> = {
  display: { fontSize: FONT_SIZE.xxl, lineHeight: 34, fontWeight: "800" },
  title: { fontSize: FONT_SIZE.xl, lineHeight: 28, fontWeight: "800" },
  heading: { fontSize: FONT_SIZE.lg, lineHeight: 24, fontWeight: "700" },
  body: { fontSize: FONT_SIZE.md, lineHeight: 23 },
  small: { fontSize: FONT_SIZE.sm, lineHeight: 19 },
  caption: { fontSize: FONT_SIZE.xs + 1, lineHeight: 16 },
};

const TONE: Record<TextTone, string> = {
  text: COLORS.text,
  muted: COLORS.textMuted,
  primary: COLORS.primary,
  success: COLORS.success,
  warning: COLORS.warning,
  danger: COLORS.danger,
  onPrimary: COLORS.onPrimary,
  donation: COLORS.donation,
};

export interface TxtProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  bold?: boolean;
  center?: boolean;
}

export function Txt({ variant = "body", tone = "text", bold = false, center = false, style, ...rest }: TxtProps) {
  return <Text {...rest} style={[VARIANT[variant], { color: TONE[tone] }, bold ? styles.bold : null, center ? styles.center : null, style]} />;
}

// ───────────── 버튼 ─────────────

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** 처리 중: 누를 수 없고 돌아가는 표시가 나와요 */
  busy?: boolean;
  /** 이름 앞의 이모지 */
  icon?: string;
  /** 낮은 버튼(카드 안 등) */
  small?: boolean;
  /** 스크린 리더용 이름 (기본은 label) */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BUTTON_PALETTE: Record<ButtonVariant, { bg: string; border: string; fg: string }> = {
  primary: { bg: COLORS.primary, border: COLORS.primary, fg: COLORS.onPrimary },
  secondary: { bg: COLORS.card, border: COLORS.primary, fg: COLORS.primary },
  danger: { bg: COLORS.card, border: COLORS.danger, fg: COLORS.danger },
  ghost: { bg: "transparent", border: "transparent", fg: COLORS.primary },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  icon,
  small = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const inactive = disabled || busy;
  const palette = BUTTON_PALETTE[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small ? styles.buttonSmall : null,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={palette.fg} /> : icon ? <Text style={styles.buttonIcon}>{icon}</Text> : null}
      <Text style={[styles.buttonLabel, small ? styles.buttonLabelSmall : null, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

// ───────────── 칩·배지 ─────────────

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** radio: 하나만 고름, checkbox: 여럿 고름, button: 그냥 누름 */
  kind?: "radio" | "checkbox" | "button";
  leading?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function Chip({ label, selected, onPress, kind = "button", leading, disabled = false, accessibilityLabel, testID }: ChipProps) {
  const state = kind === "button" ? { selected, disabled } : { checked: selected, disabled };
  return (
    <Pressable
      testID={testID}
      accessibilityRole={kind}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={state}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? COLORS.primarySoft : COLORS.card,
          borderColor: selected ? COLORS.primary : COLORS.textSubtle,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {leading}
      <Text style={[styles.chipLabel, { color: selected ? COLORS.primaryDark : COLORS.text }]}>{label}</Text>
      {selected && kind !== "button" ? <Text style={[styles.chipCheck, { color: COLORS.primaryDark }]}>✓</Text> : null}
    </Pressable>
  );
}

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

const BADGE_PALETTE: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: COLORS.bg, fg: COLORS.textMuted, border: COLORS.border },
  primary: { bg: COLORS.primarySoft, fg: COLORS.primaryDark, border: COLORS.primarySoft },
  success: { bg: COLORS.successSoft, fg: COLORS.success, border: COLORS.successSoft },
  warning: { bg: COLORS.warningSoft, fg: COLORS.warning, border: COLORS.warningSoft },
  danger: { bg: COLORS.dangerSoft, fg: COLORS.danger, border: COLORS.dangerSoft },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** 누르지 않는 작은 상태 표시 (모집 중·승인 등) */
export function Badge({ label, tone = "neutral", accessibilityLabel, style }: BadgeProps) {
  const palette = BADGE_PALETTE[tone];
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
    >
      <Text style={[styles.badgeLabel, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

// ───────────── 카드·안내·제목 ─────────────

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export type NoticeTone = "info" | "success" | "warning" | "danger";

const NOTICE_PALETTE: Record<NoticeTone, { bg: string; border: string; fg: string }> = {
  info: { bg: COLORS.primarySoft, border: COLORS.primary, fg: COLORS.primaryDark },
  success: { bg: COLORS.successSoft, border: COLORS.success, fg: COLORS.success },
  warning: { bg: COLORS.warningSoft, border: COLORS.warning, fg: COLORS.warning },
  danger: { bg: COLORS.dangerSoft, border: COLORS.danger, fg: COLORS.danger },
};

export interface NoticeProps {
  tone?: NoticeTone;
  /** 글자만 보여 줄 때 */
  message?: string;
  /** 제목(굵게) */
  title?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** 화면 안의 안내·오류 상자 (경고창 대신 이걸 써요). 오류·주의는 스크린 리더가 바로 읽어 줘요 */
export function Notice({ tone = "info", message, title, children, style, testID }: NoticeProps) {
  const palette = NOTICE_PALETTE[tone];
  return (
    <View
      testID={testID}
      accessibilityRole={tone === "danger" || tone === "warning" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
    >
      {title ? <Text style={[styles.noticeTitle, { color: palette.fg }]}>{title}</Text> : null}
      {message ? <Text style={[styles.noticeText, { color: palette.fg }]}>{message}</Text> : null}
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="heading" accessibilityRole="header" style={styles.flex}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/** 제목 + (설명) + 내용 묶음 */
export function Section({ title, hint, right, children }: { title: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionTitle right={right}>{title}</SectionTitle>
      {hint ? (
        <Txt variant="small" tone="muted">
          {hint}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

/** 목록이 비었을 때의 안내 */
export function Empty({ children, testID }: { children: string; testID?: string }) {
  return (
    <View testID={testID} style={styles.empty}>
      <Txt tone="muted" center>
        {children}
      </Txt>
    </View>
  );
}

/** "이름 ··· 값" 한 줄 */
export function KeyValue({ label, value, valueTone = "text" }: { label: string; value: string; valueTone?: TextTone }) {
  return (
    <View style={styles.keyValue}>
      <Txt variant="small" tone="muted" style={styles.keyLabel}>
        {label}
      </Txt>
      <Txt variant="small" tone={valueTone} bold style={styles.keyValueText}>
        {value}
      </Txt>
    </View>
  );
}

export interface ProgressBarProps {
  /** 0~1 */
  ratio: number;
  color?: string;
  accessibilityLabel: string;
  /** 스크린 리더가 읽을 값 (예: "42%") */
  valueText?: string;
}

export function ProgressBar({ ratio, color = COLORS.primary, accessibilityLabel, valueText }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100), text: valueText }}
      style={styles.progressTrack}
    >
      <View style={[styles.progressFill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

// ───────────── 입력 ─────────────

export interface FieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
  error?: string | null;
  /** 오른쪽 위의 글자 수 표시 (예: "12/60") */
  counter?: string;
  /** 글자 수가 넘쳤을 때 빨갛게 */
  counterOver?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Field({ label, hint, error, counter, counterOver = false, style, multiline = false, ...rest }: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Txt variant="small" tone="muted" bold style={styles.flex}>
          {label}
        </Txt>
        {counter ? (
          <Txt variant="small" tone={counterOver ? "danger" : "muted"} bold={counterOver}>
            {counter}
          </Txt>
        ) : null}
      </View>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={COLORS.textSubtle}
        multiline={multiline}
        {...rest}
        style={[styles.input, multiline ? styles.inputMultiline : null, { borderColor: error ? COLORS.danger : COLORS.textSubtle }, style]}
      />
      {error ? (
        <Txt variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" tone="muted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export interface LabeledSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  testID?: string;
}

export function LabeledSwitch({ label, value, onValueChange, hint, testID }: LabeledSwitchProps) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Txt>{label}</Txt>
        {hint ? (
          <Txt variant="small" tone="muted">
            {hint}
          </Txt>
        ) : null}
      </View>
      <Switch
        testID={testID}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.textSubtle, true: COLORS.primary }}
        thumbColor={COLORS.card}
      />
    </View>
  );
}

// ───────────── 고르기 ─────────────

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** 머리글처럼 좁은 곳에서 쓰는 낮은 모양 (누르는 영역은 hitSlop 으로 44dp 를 채워요) */
  compact?: boolean;
  /** radio: 설정값 고르기(언어), tab: 같은 화면의 내용 바꾸기 */
  kind?: "radio" | "tab";
}

export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel, compact = false, kind = "radio" }: SegmentedProps<T>) {
  return (
    <View accessibilityRole={kind === "tab" ? "tablist" : "radiogroup"} accessibilityLabel={accessibilityLabel} style={[styles.segmented, compact ? styles.segmentedCompact : null]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole={kind === "tab" ? "tab" : "radio"}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={kind === "tab" ? { selected } : { checked: selected }}
            hitSlop={compact ? { top: 5, bottom: 5, left: 2, right: 2 } : undefined}
            onPress={() => onChange(option.value)}
            style={[styles.segment, compact ? styles.segmentCompact : null, { backgroundColor: selected ? COLORS.primary : COLORS.card }]}
          >
            <Text style={[styles.segmentLabel, compact ? styles.segmentLabelCompact : null, { color: selected ? COLORS.onPrimary : COLORS.text }]} numberOfLines={compact ? 1 : 2}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** 값을 글자로 (예: "14日"). 기본은 숫자 그대로 */
  formatValue?: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
  hint?: string;
  testID?: string;
}

/** − 값 + : 범위(min~max)를 벗어나지 않아요 */
export function Stepper({ label, value, min, max, step = 1, onChange, formatValue, decreaseLabel, increaseLabel, hint, testID }: StepperProps) {
  const shown = formatValue ? formatValue(value) : String(value);
  const canDecrease = value > min;
  const canIncrease = value < max;
  return (
    <View style={styles.field} testID={testID}>
      <Txt variant="small" tone="muted" bold>
        {label}
      </Txt>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${decreaseLabel}`}
          accessibilityState={{ disabled: !canDecrease }}
          disabled={!canDecrease}
          onPress={() => onChange(Math.max(min, value - step))}
          style={[styles.stepperButton, { opacity: canDecrease ? 1 : 0.4 }]}
        >
          <Text style={styles.stepperGlyph}>−</Text>
        </Pressable>
        <View style={styles.stepperValue} accessible accessibilityLabel={`${label}: ${shown}`} accessibilityLiveRegion="polite">
          <Text style={styles.stepperValueText}>{shown}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${increaseLabel}`}
          accessibilityState={{ disabled: !canIncrease }}
          disabled={!canIncrease}
          onPress={() => onChange(Math.min(max, value + step))}
          style={[styles.stepperButton, { opacity: canIncrease ? 1 : 0.4 }]}
        >
          <Text style={styles.stepperGlyph}>+</Text>
        </Pressable>
      </View>
      {hint ? (
        <Txt variant="small" tone="muted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
  center: { textAlign: "center" },
  button: {
    minHeight: 48,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
  },
  buttonSmall: { minHeight: HIT, paddingHorizontal: SPACE.md },
  buttonLabel: { fontSize: FONT_SIZE.md, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  buttonLabelSmall: { fontSize: FONT_SIZE.sm },
  buttonIcon: { fontSize: FONT_SIZE.lg },
  chip: {
    minHeight: HIT,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs + 2,
  },
  chipLabel: { fontSize: FONT_SIZE.sm, fontWeight: "600" },
  chipCheck: { fontSize: FONT_SIZE.sm, fontWeight: "800" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACE.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  badgeLabel: { fontSize: FONT_SIZE.sm - 1, fontWeight: "700", lineHeight: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.lg,
    gap: SPACE.sm,
    ...CARD_SHADOW,
  },
  notice: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACE.md, gap: SPACE.xs },
  noticeTitle: { fontSize: FONT_SIZE.md, fontWeight: "800", lineHeight: 22 },
  noticeText: { fontSize: FONT_SIZE.sm + 1, lineHeight: 21 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  section: { gap: SPACE.sm },
  empty: {
    padding: SPACE.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.textSubtle,
    backgroundColor: COLORS.card,
  },
  divider: { height: 1, backgroundColor: COLORS.border },
  keyValue: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.md },
  keyLabel: { width: 96 },
  keyValueText: { flex: 1, textAlign: "right" },
  progressTrack: { height: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.border, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: RADIUS.pill },
  field: { gap: SPACE.xs },
  fieldHead: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm + 2,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  inputMultiline: { minHeight: 104, textAlignVertical: "top" },
  switchRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: SPACE.md },
  segmented: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.card,
  },
  segmentedCompact: { borderRadius: RADIUS.sm + 2 },
  segment: { flex: 1, minHeight: HIT, paddingHorizontal: SPACE.md, alignItems: "center", justifyContent: "center" },
  segmentCompact: { flex: 0, minHeight: 34, paddingHorizontal: SPACE.md },
  segmentLabel: { fontSize: FONT_SIZE.md, fontWeight: "700", textAlign: "center" },
  segmentLabelCompact: { fontSize: FONT_SIZE.sm },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  stepperButton: {
    width: HIT + 4,
    height: HIT + 4,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperGlyph: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: COLORS.primary, lineHeight: 24 },
  stepperValue: {
    flex: 1,
    minHeight: HIT + 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: { fontSize: FONT_SIZE.lg, fontWeight: "800", color: COLORS.text },
});
