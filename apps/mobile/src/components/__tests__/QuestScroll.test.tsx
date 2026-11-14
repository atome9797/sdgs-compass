// 퀘스트 의뢰서(#39): 웹과 같은 양피지 두루마리 — 依頼書 · 의뢰인 · 토벌 대상(몬스터 그림) · 보상 한 줄 · 남은 날 도장 · 「達成」 도장, 종이 전체가 하나의 단추.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { challengeCard } from "@sdgs-compass/core/selectors";
import { reducer } from "@sdgs-compass/core/state";
import { createInitialState } from "@sdgs-compass/data/seed";
import { foePng } from "../FoeImage";
import { QuestScroll } from "../QuestScroll";

const demo = createInitialState("2026-10-30");
const plasticOf = (state: typeof demo, locale: "ja" | "ko") => challengeCard(state, state.challenges.find((c) => c.id === "ch-plastic")!, locale);

test("의뢰서: 依頼書 · 依頼主 · 討伐対象 · 報酬 한 줄 · 「あと 12日」 도장, 누르면 onPress", async () => {
  const card = plasticOf(demo, "ja");
  const onPress = jest.fn();
  await render(<QuestScroll testID="scroll" card={card} locale="ja" showMatch onPress={onPress} />);
  expect(screen.getByText("依頼書")).toBeOnTheScreen();
  expect(screen.getByText("プラごみクラゲ")).toBeOnTheScreen();
  expect(screen.getByText("賞金 ¥100,000 ／ 🎁 みなとの干物ギフトセット ／ インターン")).toBeOnTheScreen();
  expect(screen.getByText("あと")).toBeOnTheScreen();
  expect(screen.getByText(`${card.daysLeft}日`)).toBeOnTheScreen();
  expect(screen.queryByText("達成")).not.toBeOnTheScreen();
  // 스크린 리더: 종이 전체가 단추 하나 (제목 · 의뢰인 · 토벌 대상 · 남은 날)
  expect(screen.getByTestId("scroll").props.accessibilityLabel).toBe(`${card.title}, 依頼主 ${card.companyName}, 討伐対象 プラごみクラゲ, ${card.dDay}`);
  await fireEvent.press(screen.getByTestId("scroll"));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("기획서를 낸 퀘스트: 몬스터 그림 위에 「達成」 도장, 스크린 리더에도 제출 여부", async () => {
  const submitted = reducer(demo, {
    type: "submitProposal",
    challengeId: "ch-plastic",
    draft: { teamName: "海の勇者団", teamSize: 3, seminar: "", title: "包装を変える", summary: "要約です", fileName: "plan.pdf", fileSizeBytes: 1000, videoUrl: "" },
    at: "2026-10-30T10:00",
  });
  const card = plasticOf(submitted, "ja");
  await render(<QuestScroll testID="scroll" card={card} locale="ja" onPress={() => undefined} />);
  expect(screen.getByText("達成")).toBeOnTheScreen();
  expect(screen.getByTestId("scroll").props.accessibilityLabel).toContain("提出済み（第1版）");
});

test("작은 의뢰서(마감 임박) · 한국어: 「남은 날 12일」 도장과 의뢰인 한 줄", async () => {
  const card = plasticOf(demo, "ko");
  await render(<QuestScroll testID="slip" card={card} locale="ko" compact onPress={() => undefined} />);
  expect(screen.getByText("의뢰인")).toBeOnTheScreen();
  expect(screen.getByText("남은 날")).toBeOnTheScreen();
  expect(screen.getByText(`${card.daysLeft}일`)).toBeOnTheScreen();
  expect(screen.queryByText("의뢰서")).not.toBeOnTheScreen();
  expect(screen.getByTestId("slip-foe")).toBeOnTheScreen();
});

test("몬스터 그림은 PNG 데이터 URI 로 한 번만 만들어요 (모양 · 색마다)", () => {
  const a = foePng("jelly", "#0A97D9");
  expect(a.uri.startsWith("data:image/png;base64,iVBORw0KGgo")).toBe(true);
  expect(a.ratio).toBe(1);
  expect(foePng("jelly", "#0A97D9")).toBe(a);
  expect(foePng("smog", "#FCC30B").ratio).toBeCloseTo(28 / 32);
});
