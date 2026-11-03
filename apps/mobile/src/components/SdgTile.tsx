// SDGs 17목표: 번호가 들어간 색 타일. 공식 로고·아이콘 이미지는 쓰지 않고(UN 공식 서비스가 아니에요), 공개된 색상값과 번호만 써요.
// SdgTile(타일 하나) · SdgMiniRow(카드 안의 작은 타일들) · SdgGrid(홈의 17개 타일 — 목표별 모집 중 과제 수) · SdgPicker(여럿 고르는 칩 목록)
// 색감: 작은 표시(작은 타일·칩의 점)는 공식 색 그대로, 넓게 까는 홈 타일은 옅은 바탕 + 왼쪽 색 띠 + 본문 글자색(웹 .sdg-tile 과 같아요).
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { Locale } from "@sdgs-compass/core/i18n";
import { sdgLabel } from "@sdgs-compass/core/labels";
import { getSdg, sdgTextColor, type SdgId } from "@sdgs-compass/core/sdg";
import type { SdgCountTileVM, SdgTileVM } from "@sdgs-compass/core/selectors";
import { Chip } from "@/components/ui";
import { COLORS, PHONE_WIDTH, RADIUS, SDG_TILE_TINT, SPACE, tint } from "@/theme";

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

/** 공식 색을 그대로 칠한 작은 표시 (번호 타일) */
export function SdgTile({ id, size = 44, short, selected = false, onPress, accessibilityLabel, testID }: SdgTileProps) {
  const color = getSdg(id).color;
  const textColor = sdgTextColor(id);
  const showShort = short !== undefined && size >= 44;
  const tile = (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: color, borderRadius: size >= 40 ? RADIUS.md : 6 }, selected ? styles.tileSelected : null]}>
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
/** 홈 타일 한 칸의 최소 폭(dp): 5글자 이름(ジェンダー·エネルギー 등)이 줄임표 없이 들어가는 폭. 6칸이 이보다 좁아지는 화면(320~340dp)은 5칸으로 놓아요 */
const GRID_MIN_TILE = 48;

/**
 * 홈의 SDGs 17목표 타일 (#29): 큰 숫자 = 그 목표가 붙은 모집 중 과제 수 + 작은 단위, 목표 번호는 이름 위에 작게(웹 .sdg-tile 과 같은 배치).
 * 0건은 바탕·띠를 옅게, 글자는 textMuted 로 — 흐려 보여도 대비는 지키고 누를 수도 있어요. 누르면 그 목표로 검색해요(검색 결과의 모집 중 수와 같은 숫자).
 */
export function SdgGrid({ tiles, onPress }: { tiles: readonly SdgCountTileVM[]; onPress: (id: SdgId) => void }) {
  const { width } = useWindowDimensions();
  const available = Math.min(width, PHONE_WIDTH) - SPACE.lg * 2;
  const fit = (columns: number) => Math.floor((available - GRID_GAP * (columns - 1)) / columns);
  const columns = fit(GRID_COLUMNS) >= GRID_MIN_TILE ? GRID_COLUMNS : GRID_COLUMNS - 1;
  const size = Math.max(44, fit(columns));
  const countSize = Math.round(size * 0.36);
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => {
        const zero = tile.openCount === 0;
        const ink = zero ? COLORS.textMuted : COLORS.text;
        return (
          <Pressable
            key={tile.id}
            testID={`sdg-tile-${tile.id}`}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
            onPress={() => onPress(tile.id)}
            // 이름 위에 목표 번호 줄이 생겨서 정사각형보다 조금 길어요 (숫자·번호·이름 세 줄)
            style={({ pressed }) => [styles.countTile, { width: size, minHeight: size + 14, backgroundColor: tint(tile.color, zero ? SDG_TILE_TINT.zero : SDG_TILE_TINT.base), opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.softBar, { backgroundColor: zero ? tint(tile.color, SDG_TILE_TINT.zeroBar) : tile.color }]} />
            <Text style={{ color: ink, fontSize: countSize, lineHeight: countSize + 4, fontWeight: zero ? "700" : "800" }}>
              {tile.openCount}
              <Text style={styles.unit}>{tile.unit}</Text>
            </Text>
            <View style={styles.countLabel}>
              <Text style={styles.goalNo}>{tile.id}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.countShort, { color: ink }]}>
                {tile.short}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface SdgPickerProps {
  /** 개수가 붙은 칩(SdgCountTileVM — 검색 화면)이면 「번호 짧은 이름」 뒤에 모집 중 과제 수를 작게 붙여요(#29). 고르는 화면(과제 만들기·인재·글쓰기)은 개수 없는 SdgTileVM */
  tiles: readonly (SdgTileVM | SdgCountTileVM)[];
  locale: Locale;
  selected: readonly SdgId[];
  onToggle: (id: SdgId) => void;
  /** 고를 수 있는 최대 개수 (넘으면 아직 안 고른 칩이 흐려져요) */
  max?: number;
}

/** SDGs 를 여럿 고르는 칩 목록 (검색·인재 필터·출제 화면). 칩에는 공식 색 점 + "번호 짧은 이름"(웹 칩과 같아요) */
export function SdgPicker({ tiles, locale, selected, onToggle, max }: SdgPickerProps) {
  const full = max !== undefined && selected.length >= max;
  return (
    <View style={styles.pickerWrap}>
      {tiles.map((tile) => {
        const isSelected = selected.includes(tile.id);
        const counted = "openCount" in tile;
        return (
          <Chip
            key={tile.id}
            kind="checkbox"
            label={`${tile.id} ${tile.short}`}
            count={counted ? tile.openCount : undefined}
            accessibilityLabel={counted ? tile.label : sdgLabel(tile.id, locale)}
            selected={isSelected}
            disabled={full && !isSelected}
            leading={<View style={[styles.chipDot, { backgroundColor: tile.color }]} />}
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
  // 홈 타일: 위에 큰 숫자(모집 중 과제 수), 아래에 목표 번호(작게)와 이름(왼쪽 정렬). 색 띠는 글자 폭을 줄이지 않게 겹쳐 그려요
  countTile: { alignItems: "flex-start", justifyContent: "space-between", paddingLeft: 7, paddingRight: 2, paddingTop: 5, paddingBottom: 6, borderRadius: RADIUS.md, overflow: "hidden" },
  softBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  unit: { fontSize: 10, fontWeight: "700" },
  countLabel: { gap: 1, maxWidth: "100%" },
  goalNo: { fontSize: 10, lineHeight: 12, fontWeight: "700", color: COLORS.textMuted },
  countShort: { fontSize: 10, lineHeight: 13, fontWeight: "700", maxWidth: "100%" },
  pickerWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm },
  chipDot: { width: 12, height: 12, borderRadius: 4 },
});
