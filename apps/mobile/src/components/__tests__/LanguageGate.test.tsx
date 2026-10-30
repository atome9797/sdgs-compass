// 맨 처음 화면(언어 선택): 일본어·한국어 단추가 보이고, 누른 언어가 그대로 전해져요.
// 기기 언어(detected)는 "추천" 안내만 붙을 뿐 저절로 고르지는 않아요.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LanguageGate } from "../LanguageGate";

test("두 언어 단추가 보이고, 누르기 전에는 아무것도 고르지 않아요", async () => {
  const onSelect = jest.fn();
  await render(<LanguageGate detected="ko" onSelect={onSelect} />);
  expect(screen.getByTestId("language-ja")).toBeOnTheScreen();
  expect(screen.getByTestId("language-ko")).toBeOnTheScreen();
  expect(onSelect).not.toHaveBeenCalled();
});

test("누른 언어가 onSelect 로 전해져요", async () => {
  const onSelect = jest.fn();
  await render(<LanguageGate detected="ja" onSelect={onSelect} />);
  await fireEvent.press(screen.getByTestId("language-ko"));
  expect(onSelect).toHaveBeenLastCalledWith("ko");
  await fireEvent.press(screen.getByTestId("language-ja"));
  expect(onSelect).toHaveBeenLastCalledWith("ja");
  expect(onSelect).toHaveBeenCalledTimes(2);
});

test("추천 안내는 기기 언어 쪽 단추에만 붙어요", async () => {
  await render(<LanguageGate detected="ko" onSelect={() => undefined} />);
  expect(screen.getByText("기기 언어에 맞춘 추천")).toBeOnTheScreen();
  expect(screen.queryByText("端末の言語に合わせたおすすめ")).not.toBeOnTheScreen();
});
