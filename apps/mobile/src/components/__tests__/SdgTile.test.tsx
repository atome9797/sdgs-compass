// SDGs 타일: onPress 가 있으면 체크박스처럼 눌리고, 선택된 타일에는 ✓ 가 붙어요.
// 홈 타일(SdgGrid, #29): 큰 숫자는 그 목표의 모집 중 과제 수이고, 스크린 리더용 이름에 목표·개수가 다 들어가요.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { selectHome, selectSdgCountTiles, selectSdgTiles } from "@sdgs-compass/core/selectors";
import { createInitialState } from "@sdgs-compass/data/seed";
import { SdgGrid, SdgPicker, SdgTile } from "../SdgTile";

test("누르면 onPress 가 불리고, 선택 전에는 ✓ 가 없어요", async () => {
  const onPress = jest.fn();
  await render(<SdgTile id={14} size={52} testID="tile-14" accessibilityLabel="目標14 海の豊かさを守ろう" onPress={onPress} />);
  expect(screen.queryByText("✓")).not.toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("tile-14"));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("선택된 타일에는 ✓ 가 보여요", async () => {
  await render(<SdgTile id={12} size={52} selected testID="tile-12" accessibilityLabel="目標12 つくる責任つかう責任" onPress={() => undefined} />);
  expect(screen.getByText("✓")).toBeOnTheScreen();
});

const demo = createInitialState("2026-10-30");

test("홈 타일: 큰 숫자 + 단위(모집 중 과제 수), 이름 위에 목표 번호, 스크린 리더용 이름에 다 들어가요", async () => {
  const onPress = jest.fn();
  await render(<SdgGrid tiles={selectHome(demo, "ja").sdgTiles} onPress={onPress} />);
  expect(screen.getByLabelText("目標14 海の豊かさを守ろう・募集中のクエスト 2件")).toBeOnTheScreen();
  expect(screen.getByText("3件")).toBeOnTheScreen(); // 목표 12 (샘플에서 가장 많아요)
  expect(screen.getByText("海")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("sdg-tile-14"));
  expect(onPress).toHaveBeenLastCalledWith(14);
  // 0건(목표 1)은 흐리게 보여도 누를 수 있어요
  expect(screen.getByLabelText("目標1 貧困をなくそう・募集中のクエスト 0件")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("sdg-tile-1"));
  expect(onPress).toHaveBeenLastCalledWith(1);
});

test("한국어 홈 타일은 단위가 「개」예요", async () => {
  await render(<SdgGrid tiles={selectHome(demo, "ko").sdgTiles} onPress={() => undefined} />);
  expect(screen.getByLabelText("목표 14 해양 생태계 보전 · 모집 중인 퀘스트 2개")).toBeOnTheScreen();
  expect(screen.getByText("3개")).toBeOnTheScreen();
});

test("검색 화면의 칩에는 모집 중 수가 붙어요", async () => {
  await render(<SdgPicker tiles={selectSdgCountTiles(demo, "ja")} locale="ja" selected={[14]} onToggle={() => undefined} />);
  expect(screen.getByText("14 海")).toBeOnTheScreen();
  expect(screen.getByLabelText("目標14 海の豊かさを守ろう・募集中のクエスト 2件")).toBeOnTheScreen();
  expect(screen.getByText("3")).toBeOnTheScreen(); // 목표 12 칩의 개수 (샘플에서 3건은 목표 12 하나뿐)
});

test("고르는 화면(과제 만들기·인재·글쓰기)의 칩에는 숫자가 없어요", async () => {
  await render(<SdgPicker tiles={selectSdgTiles("ja")} locale="ja" selected={[]} onToggle={() => undefined} />);
  expect(screen.getByText("14 海")).toBeOnTheScreen();
  expect(screen.getByLabelText("目標14 海の豊かさを守ろう")).toBeOnTheScreen();
  expect(screen.queryByText("0")).not.toBeOnTheScreen();
});
