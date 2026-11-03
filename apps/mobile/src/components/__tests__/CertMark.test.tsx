// SDGs 실천 마크(#35): 회사 이름 옆의 마크 단추(이름 + ★숫자 + ?, 스크린 리더 이름에 숫자, 누르면 펼침) · 자세한 안내(독자 기준 + 기준 한 줄) · 별 그림.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { CERT_DISCLAIMER } from "@sdgs-compass/core/certification";
import { selectCompanyMark } from "@sdgs-compass/core/selectors";
import { createInitialState } from "@sdgs-compass/data/seed";
import { CertMarkBadge, CertMarkButton, CertMarkDetail, StarRow } from "../CertMark";

const demo = createInitialState("2026-10-30");
const hikari = selectCompanyMark(demo, "co-hikari", "ja")!; // ★4.5 (샘플)

test("마크 단추: 「SDGs取組みマーク ★4.5 ?」 — 스크린 리더 이름에 숫자가 들고, 누르면 onToggle 이 불려요", async () => {
  const onToggle = jest.fn();
  await render(<CertMarkButton testID="mark" mark={hikari} open={false} onToggle={onToggle} />);
  expect(screen.getByLabelText("SDGs取組みマーク 5段階中4.5")).toBeOnTheScreen();
  expect(screen.getByTestId("mark").props.accessibilityState).toMatchObject({ expanded: false });
  expect(screen.getByText("SDGs取組みマーク", { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByText("4.5", { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByText("?", { includeHiddenElements: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("mark"));
  expect(onToggle).toHaveBeenCalledTimes(1);
});

test("펼친 단추는 expanded 로 알려요", async () => {
  await render(<CertMarkButton testID="mark" mark={hikari} open onToggle={() => undefined} />);
  expect(screen.getByTestId("mark").props.accessibilityState).toMatchObject({ expanded: true });
});

test("자세한 안내: 별 그림 + 이름 + 숫자, 독자 기준이라는 기존 안내, 기준 한 줄 (한국어)", async () => {
  const ko = selectCompanyMark(demo, "co-hikari", "ko")!;
  await render(<CertMarkDetail testID="note" mark={ko} />);
  expect(screen.getByLabelText("SDGs 실천 마크 5단계 중 4.5")).toBeOnTheScreen();
  expect(screen.getByText(CERT_DISCLAIMER.ko)).toBeOnTheScreen();
  expect(screen.getByText("기준: ESG 6개 항목의 달성도(증빙 자료가 있는 항목만, 100점 만점) 10점마다 ★0.5, 100점이면 ★5.0.")).toBeOnTheScreen();
});

test("별 그림: ★2.5 는 빈 별 5개 위에 칠한 별 3개(가득 2 · 반 1)", async () => {
  await render(<StarRow testID="stars" icons={["full", "full", "half", "empty", "empty"]} />);
  expect(screen.getAllByText("☆", { includeHiddenElements: true })).toHaveLength(5);
  expect(screen.getAllByText("★", { includeHiddenElements: true })).toHaveLength(3);
});

test("카드 안의 마크는 누르지 않는 표시예요 (이름은 같아요)", async () => {
  await render(<CertMarkBadge testID="badge" mark={hikari} />);
  expect(screen.getByLabelText("SDGs取組みマーク 5段階中4.5")).toBeOnTheScreen();
  expect(screen.queryByText("?", { includeHiddenElements: true })).not.toBeOnTheScreen();
});
