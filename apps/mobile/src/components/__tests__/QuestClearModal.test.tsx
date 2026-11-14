// 퀘스트 달성 팝업(#47, 앱): 처음 한 번은 승리 연출 → 「スキップ」하면 창(「봤어요」), 창에서는 상금 · 상품 중 하나를 골라 정해요.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { selectQuestClear } from "@sdgs-compass/core/questClear";
import { reducer, type Action } from "@sdgs-compass/core/state";
import type { DemoState } from "@sdgs-compass/core/domain";
import { createInitialState } from "@sdgs-compass/data/seed";
import { QuestClearModal } from "../QuestClearModal";

const run = (state: DemoState, ...actions: Action[]) => actions.reduce(reducer, state);
const submitted = run(createInitialState("2026-10-30"), {
  type: "submitProposal",
  challengeId: "ch-plastic",
  draft: { teamName: "海の勇者団", teamSize: 3, seminar: "", title: "包装を変える", summary: "要約です", fileName: "plan.pdf", fileSizeBytes: 1000, videoUrl: "" },
  at: "2026-10-30T10:00",
});
const mineId = submitted.proposals.find((p) => p.mine)!.id;
const grand = run(
  submitted,
  { type: "reviewProposal", proposalId: mineId, review: { creativity: 4, feasibility: 4, sdgContribution: 5, comment: "" }, at: "2026-10-30T11:00" },
  { type: "awardProposal", proposalId: mineId, award: "grand" },
);

test("처음 한 번: 승리 연출(기업이 골랐다 · 몬스터 HP 30%) → 「スキップ」하면 창, 그때 「봤어요」", async () => {
  const vm = selectQuestClear(grand, "ja")!;
  const onSeen = jest.fn();
  await render(<QuestClearModal vm={vm} onSeen={onSeen} onChoose={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByTestId("clear-victory")).toBeOnTheScreen();
  expect(screen.getByText("みなと海洋フーズ株式会社が 勇者Minaの 企画書を えらんだ！")).toBeOnTheScreen();
  expect(screen.getByTestId("clear-hp").props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: "30%" })]));
  await fireEvent.press(screen.getByTestId("clear-skip"));
  expect(onSeen).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("clear-window")).toBeOnTheScreen();
  expect(screen.getByText("クエスト達成！")).toBeOnTheScreen();
});

test("창: 상금 · 상품 중에서 고르기 전에는 정할 수 없고, 고르면 onChoose · 「あとで」는 onClose", async () => {
  const vm = { ...selectQuestClear(grand, "ja")!, fresh: false };
  const onChoose = jest.fn();
  const onClose = jest.fn();
  await render(<QuestClearModal vm={vm} onSeen={jest.fn()} onChoose={onChoose} onClose={onClose} />);
  expect(screen.getByText("賞金 ¥100,000")).toBeOnTheScreen();
  expect(screen.getByText("みなとの干物ギフトセット")).toBeOnTheScreen();
  expect(screen.getByText("企業の評価で EXP +130（SDG 14・12）")).toBeOnTheScreen();
  expect(screen.getByTestId("reward-confirm")).toBeDisabled();
  await fireEvent.press(screen.getByTestId("reward-option-item"));
  expect(screen.getByTestId("reward-option-item").props.accessibilityState).toEqual({ checked: true });
  await fireEvent.press(screen.getByTestId("reward-confirm"));
  expect(onChoose).toHaveBeenCalledWith("item");
  await fireEvent.press(screen.getByText("あとで えらぶ"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("고른 뒤(한국어): 받은 줄과 「닫기」", async () => {
  const chosen = run(grand, { type: "chooseReward", proposalId: mineId, reward: "prize" });
  const vm = selectQuestClear(chosen, "ko", mineId)!;
  await render(<QuestClearModal vm={vm} onSeen={jest.fn()} onChoose={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByTestId("reward-chosen")).toBeOnTheScreen();
  expect(screen.getByText("퀘스트 달성!")).toBeOnTheScreen();
  expect(screen.getByText("닫기")).toBeOnTheScreen();
  expect(screen.queryByTestId("reward-confirm")).not.toBeOnTheScreen();
});
