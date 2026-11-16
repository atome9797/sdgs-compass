// 홈의 「모험 지도」 바탕(#57): 모눈은 본문 크기에 맞춰 24dp 마다 선을 긋고, 장식 그림(웹과 같은 PNG)은 화면 읽기에서 빠져요.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { MAP_DECOR } from "@sdgs-compass/core/adventureMap";
import { MAP_DECOR_URI, MapDecor, MapGrid } from "../MapPaper";

test("모눈: 크기를 알기 전에는 선이 없고, 100 × 50 이면 가로선 3개 · 세로선 5개", async () => {
  await render(<MapGrid testID="grid" />);
  expect((screen.toJSON() as { children: unknown[] | null }).children).toBeNull();
  await fireEvent(screen.getByTestId("grid"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 50 } } });
  expect((screen.toJSON() as { children: unknown[] | null }).children).toHaveLength(8);
  expect(screen.getByTestId("grid").props.importantForAccessibility).toBe("no-hide-descendants");
});

test("장식 그림: 데이터 PNG 를 160 × 88 로 오른쪽 위에 두고, 화면 읽기에서 빠져요", async () => {
  await render(<MapDecor testID="decor" />);
  const decor = screen.getByTestId("decor");
  expect(MAP_DECOR_URI.startsWith("data:image/png;base64,")).toBe(true);
  expect(decor.props.source).toEqual({ uri: MAP_DECOR_URI });
  expect(StyleSheet.flatten(decor.props.style)).toMatchObject({ position: "absolute", top: 4, right: 8, width: MAP_DECOR.w * MAP_DECOR.scale, height: MAP_DECOR.h * MAP_DECOR.scale });
  expect(decor.props.accessible).toBe(false);
  expect(decor.props.importantForAccessibility).toBe("no-hide-descendants");
});
