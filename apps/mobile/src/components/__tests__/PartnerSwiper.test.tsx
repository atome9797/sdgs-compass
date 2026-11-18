// 첫 화면의 협력 단체 배너(Swiper 처럼 저절로 넘어가는 광고 배너): 단체 이름 · 「サンプル」 · 광고 문구 · 관련 퀘스트 단추, 아래 점과 멈춤 단추.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeT } from "@sdgs-compass/core/messages";
import { selectPartnerBanners } from "@sdgs-compass/core/selectors";
import { PartnerSwiper } from "../PartnerSwiper";

const slides = selectPartnerBanners("ja");
const t = makeT("ja");

test("배너: 단체마다 이름 · 「サンプル」 · 광고 문구, 「関連するクエストを見る」를 누르면 그 단체의 SDGs 목표로 검색", async () => {
  const onOpen = jest.fn();
  await render(<PartnerSwiper testID="partners" slides={slides} t={t} onOpen={onOpen} />);
  expect(screen.getByText(slides[0].name)).toBeOnTheScreen();
  expect(screen.getByText(slides[0].headline)).toBeOnTheScreen();
  expect(screen.getAllByText("サンプル").length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByTestId(`partners-slide-${slides[0].id}-cta`));
  expect(onOpen).toHaveBeenCalledWith(slides[0].sdgIds);
});

test("아래 점: 장마다 하나, 지금 장이 선택됨 · 누르면 그 장으로. 멈춤 단추를 누르면 「自動で切り替える」로 바뀌어요", async () => {
  await render(<PartnerSwiper testID="partners" slides={slides} t={t} onOpen={() => undefined} />);
  expect(screen.getByTestId("partners-dot-0").props.accessibilityState).toEqual({ selected: true });
  expect(screen.getByTestId("partners-dot-1").props.accessibilityState).toEqual({ selected: false });
  expect(screen.getByLabelText("2枚目を表示")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("partners-dot-1"));
  expect(screen.getByTestId("partners-dot-1").props.accessibilityState).toEqual({ selected: true });
  expect(screen.getByLabelText("自動で切り替えるのを止める")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("partners-toggle"));
  expect(screen.getByLabelText("自動で切り替える")).toBeOnTheScreen();
});
