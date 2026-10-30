// SDGs 17목표: 번호가 들어간 색 타일. 공식 로고·아이콘 이미지는 쓰지 않고(UN 공식 서비스가 아니에요), 공개된 색상값과 번호만 써요.
// SdgTile(타일 하나) · SdgMiniRow(카드 안의 작은 타일들) · SdgGrid(홈의 17개 타일) · SdgPicker(여럿 고르는 칩 목록)
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { Locale } from "@sdgs-compass/core/i18n";
import { sdgLabel } from "@sdgs-compass/core/labels";
import { getSdg, sdgTextColor, type SdgId } from "@sdgs-compass/core/sdg";
import type { SdgTileVM } from "@sdgs-compass/core/selectors";
import { Chip } from "@/components/ui";
import { COLORS, PHONE_WIDTH, RADIUS, SPACE } from "@/theme";

export interface SdgTileProps {
  id: SdgId;
  /** 한 변 길이(dp) */
  size?: number;
  /** 번호 아래의 짧은 이름 (타일이 클 때만 보여요) */
  short?: string;
  selected?: boolean;
  /** 주면 누를 수 있는 타일(체크박스)이 돼요 */
  onPress?: () => void;
  /** 스크린 리더용 이름 (예: "目標14 海の豊かさを守ろう") */
  accessibilityLabel?: string;
  testID?: string;
}

export function SdgTile({ id, size = 44, short, selected = false, onPress, accessibilityLabel, testID }: SdgTileProps) {
  const color = getSdg(id).color;
  const textColor = sdgTextColor(id);
  const showShort = short !== undefined && size >= 44;
  const tile = (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: color, borderRadius: size >= 40 ? RADIUS.md : 6 },
        selected ? styles.tileSelected : null,
      ]}
    >
      <Text style={[styles.number, { color: textColor, fontSize: Math.round(size * (showShort ? 0.4 : 0.5)) }]}>{id}</Text>
      {showShort ? (
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.short, { color: textColor }]}>
          {short}
        </Text>
      ) : null}
      {selected ? (
        <View style={styles.check}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      ) : null}
    </View>
  );
  if (!onPress) {
    return (
      <View testID={testID} accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel}>
        {tile}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? String(id)}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {tile}
    </Pressable>
  );
}

/** 카드 안에 나란히 놓는 작은 타일들 (읽기 전용) */
export function SdgMiniRow({ ids, size = 24 }: { ids: readonly SdgId[]; size?: number }) {
  if (ids.length === 0) return null;
  return (
    <View style={styles.miniRow}>
      {ids.map((id) => (
        <SdgTile key={id} id={id} size={size} />
      ))}
    </View>
  );
}

const GRID_COLUMNS = 6;
const GRID_GAP = SPACE.sm;

/** 홈의 SDGs 17목표 타일: 누르면 그 목표로 검색해요 */
export function SdgGrid({ tiles, locale, onPress }: { tiles: readonly SdgTileVM[]; locale: Locale; onPress: (id: SdgId) => void }) {
  const { width } = useWindowDimensions();
  const available = Math.min(width, PHONE_WIDTH) - SPACE.lg * 2;
  const size = Math.max(44, Math.floor((available - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS));
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <SdgTile key={tile.id} id={tile.id} size={size} short={tile.short} accessibilityLabel={sdgLabel(tile.id, locale)} onPress={() => onPress(tile.id)} />
      ))}
    </View>
  );
}

export interface SdgPickerProps {
  tiles: readonly SdgTileVM[];
  locale: Locale;
  selected: readonly SdgId[];
  onToggle: (id: SdgId) => void;
  /** 고를 수 있는 최대 개수 (넘으면 아직 안 고른 칩이 흐려져요) */
  max?: number;
}

/** SDGs 를 여럿 고르는 칩 목록 (검색·인재 필터·출제 화면) */
export function SdgPicker({ tiles, locale, selected, onToggle, max }: SdgPickerProps) {
  const full = max !== undefined && selected.length >= max;
  return (
    <View style={styles.pickerWrap}>
      {tiles.map((tile) => {
        const isSelected = selected.includes(tile.id);
        return (
          <Chip
            key={tile.id}
            kind="checkbox"
            label={tile.short}
            accessibilityLabel={sdgLabel(tile.id, locale)}
            selected={isSelected}
            disabled={full && !isSelected}
            leading={<SdgTile id={tile.id} size={24} />}
            onPress={() => onToggle(tile.id)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  tileSelected: { borderWidth: 3, borderColor: COLORS.text },
  number: { fontWeight: "800" },
  short: { fontSize: 10, fontWeight: "700", maxWidth: "100%" },
  check: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: COLORS.onPrimary, fontSize: 10, fontWeight: "800", lineHeight: 12 },
  miniRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  pickerWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
});
