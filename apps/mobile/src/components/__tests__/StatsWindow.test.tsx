// 능력치 창(#43): 17개 목표를 한 줄씩(공식 이름 · 숫자 · 10칸 막대), 가장 높은 3개는 「得意」, 화면 읽기 프로그램에는 한 줄을 통째로.
import { render, screen } from "@testing-library/react-native";
import { selectImpact } from "@sdgs-compass/core/selectors";
import { createInitialState } from "@sdgs-compass/data/seed";
import { StatsWindow } from "../StatsWindow";

const demo = createInitialState("2026-10-30");

test("17개 목표 · 공식 이름 · 「得意」 표시 · 한 줄씩 읽는 이름", async () => {
  const vm = selectImpact(demo, "ja");
  await render(<StatsWindow stats={vm.stats} locale="ja" testID="stats" />);
  expect(screen.getByText("SDGs ステータス")).toBeOnTheScreen();
  for (const stat of vm.stats) expect(screen.getByLabelText(stat.ariaLabel)).toBeOnTheScreen();
  const sea = vm.stats.find((s) => s.id === 14)!;
  expect(screen.getByTestId("stats-14").props.accessibilityLabel).toBe(`目標14 海の豊かさを守ろう ${sea.score}（得意）`);
  expect(screen.getAllByText("★ 得意", { includeHiddenElements: true })).toHaveLength(vm.stats.filter((s) => s.top).length);
});

test("한국어: 제목과 「강점」", async () => {
  const vm = selectImpact(demo, "ko");
  await render(<StatsWindow stats={vm.stats} locale="ko" />);
  expect(screen.getByText("SDGs 스테이터스")).toBeOnTheScreen();
  expect(screen.getAllByText("★ 강점", { includeHiddenElements: true }).length).toBeGreaterThan(0);
});
