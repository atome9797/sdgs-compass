// 검색 입력 칸: 🔎 + 글자 입력 + (있으면) 검색 단추. 홈·검색·인재 검색이 함께 써요.
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui";
import { COLORS, FONT_SIZE, RADIUS, SPACE } from "@/theme";

export interface SearchBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** 주면 검색 단추가 생기고, 키보드의 검색 키도 이걸 불러요 */
  onSubmit?: () => void;
  submitLabel?: string;
  testID?: string;
}

export function SearchBox({ value, onChangeText, placeholder, onSubmit, submitLabel, testID }: SearchBoxProps) {
  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <Text style={styles.icon} accessible={false}>
          🔎
        </Text>
        <TextInput
          testID={testID}
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSubtle}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {onSubmit && submitLabel ? <Button small label={submitLabel} onPress={onSubmit} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.textSubtle,
    backgroundColor: COLORS.card,
  },
  icon: { fontSize: FONT_SIZE.lg },
  input: { flex: 1, minHeight: 44, fontSize: FONT_SIZE.md, color: COLORS.text, paddingVertical: SPACE.xs },
});
