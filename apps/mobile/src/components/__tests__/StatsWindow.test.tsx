// 용사의 스테이터스 창(#43 · #45): 17개 항목을 한 줄씩(공식 이름 · Lv · EXP 막대 · 다음 레벨까지), EXP 가 가장 높은 3개는 「得意」, 화면 읽기 프로그램에는 한 줄을 통째로.
import { render, screen } from "@testing-library/react-native";
import { selectImpact } from "@sdgs-compass/core/selectors";
import { createInitialState } from "@sdgs-compass/data/seed";
import { StatsWindow } from "../StatsWindow";

const demo = createInitialState("2026-10-30");

test("17개 항목 · 공식 이름 · Lv · EXP · 「得意」 표시 · 한 줄씩 읽는 이름", async () => {
  const vm = selectImpact(demo, "ja");
  await render(<StatsWindow stats={vm.stats} locale="ja" testID="stats" />);
  expect(screen.getByText("勇者のステータス")).toBeOnTheScreen();
  for (const stat of vm.stats) expect(screen.getByLabelText(stat.ariaLabel)).toBeOnTheScreen();
  // 샘플의 14 는 평가 1건(11점) → EXP 110 · Lv.2 · 다음 레벨(200)까지 90
  expect(screen.getByTestId("stats-14").props.accessibilityLabel).toBe("目標14 海の豊かさを守ろう レベル2 経験値110、次のレベルまで90");
  expect(screen.getAllByText("EXP 110", { includeHiddenElements: true }).length).toBeGreaterThan(0);
  expect(screen.getAllByText("次まで 90", { includeHiddenElements: true }).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Lv.2", { includeHiddenElements: true }).length).toBe(vm.stats.filter((s) => s.level === 2).length);
  expect(screen.getAllByText("★ 得意", { includeHiddenElements: true })).toHaveLength(vm.stats.filter((s) => s.top).length);
});

test("한국어: 제목 · 「다음까지」 · 「강점」", async () => {
  const vm = selectImpact(demo, "ko");
  await render(<StatsWindow stats={vm.stats} locale="ko" />);
  expect(screen.getByText("용사의 스테이터스")).toBeOnTheScreen();
  expect(screen.getAllByText("다음까지 90", { includeHiddenElements: true }).length).toBeGreaterThan(0);
  expect(screen.getAllByText("★ 강점", { includeHiddenElements: true }).length).toBeGreaterThan(0);
});
