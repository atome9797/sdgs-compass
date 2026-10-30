// SDGs 타일: onPress 가 있으면 체크박스처럼 눌리고, 선택된 타일에는 ✓ 가 붙어요.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SdgTile } from "../SdgTile";

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
