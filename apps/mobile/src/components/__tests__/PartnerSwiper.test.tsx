// 첫 화면의 협력 단체 배너(Swiper 처럼 저절로 넘어가는 광고 배너): 단체 이름 · 광고 문구 · 단추, 아래 점과 멈춤 단추.
// 실제 단체는 「ウェブサイトを見る ↗」(브라우저) · 허락받은 로고, 가상의 샘플은 「サンプル」 표시와 「関連するクエストを見る」(SDGs 목표로 검색).
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { Linking } from "react-native";
import { makeT } from "@sdgs-compass/core/messages";
import { selectPartnerBanners, type PartnerBannerVM } from "@sdgs-compass/core/selectors";
import { PartnerSwiper } from "../PartnerSwiper";

const slides = selectPartnerBanners("ja");
const t = makeT("ja");
const real = slides.filter((slide) => !slide.sample);

// 지금 배너에는 가상의 샘플이 없어서, 샘플 단추를 확인할 때만 쓰는 테스트용 장
const SAMPLE: PartnerBannerVM = {
  id: "pt-test-sample",
  name: "テスト団体",
  kind: "テスト用の団体",
  headline: "テストの見出し",
  body: "テストの紹介文です。",
  emoji: "🌊",
  accent: "#1B4965",
  sdgIds: [14],
  url: null,
  logo: null,
  sample: true,
};

// Linking.openURL 은 react-native 의 jest 설정이 이미 jest.fn 으로 바꿔 둬서, spyOn 이 그 함수를 그대로 돌려줘요.
// restoreAllMocks 만으로는 앞 테스트의 호출 기록이 남으므로, 테스트마다 먼저 지워요.
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("실제 단체: 이름 · 광고 문구, 「サンプル」 없음 · 「ウェブサイトを見る ↗」를 누르면 그 단체의 웹사이트를 열어요", async () => {
  expect(real.length).toBeGreaterThanOrEqual(2);
  const onOpen = jest.fn();
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await render(<PartnerSwiper testID="partners" slides={slides} t={t} onOpen={onOpen} />);
  for (const p of real) {
    if (!p.url) throw new Error(`${p.id}: 웹사이트가 없어요`);
    const slide = within(screen.getByTestId(`partners-slide-${p.id}`));
    expect(slide.getByText(p.name)).toBeOnTheScreen();
    expect(slide.getByText(p.headline)).toBeOnTheScreen();
    expect(slide.getByText(p.body)).toBeOnTheScreen();
    expect(slide.queryByText("サンプル")).toBeNull();
    expect(slide.getByText("ウェブサイトを見る ↗")).toBeOnTheScreen();
    const cta = screen.getByTestId(`partners-slide-${p.id}-cta`);
    expect(cta.props.accessibilityRole).toBe("link");
    expect(cta.props.accessibilityHint).toBe("ブラウザで開きます");
    await fireEvent.press(cta);
    expect(openURL).toHaveBeenLastCalledWith(p.url);
  }
  expect(openURL).toHaveBeenCalledTimes(real.length);
  expect(onOpen).not.toHaveBeenCalled();
});

test("로고: 허락받은 단체는 로고 그림, 없는 단체는 이모지", async () => {
  await render(<PartnerSwiper testID="partners" slides={slides} t={t} onOpen={() => undefined} />);
  for (const p of slides) {
    const slide = within(screen.getByTestId(`partners-slide-${p.id}`));
    if (p.logo) {
      expect(screen.getByTestId(`partners-slide-${p.id}-logo`)).toBeOnTheScreen();
      expect(slide.queryByText(p.emoji)).toBeNull();
    } else {
      expect(screen.queryByTestId(`partners-slide-${p.id}-logo`)).toBeNull();
      expect(slide.getByText(p.emoji)).toBeOnTheScreen();
    }
  }
  expect(slides.some((p) => p.logo)).toBe(true);
});

test("가상의 샘플 단체: 「サンプル」 표시 · 「関連するクエストを見る」를 누르면 그 단체의 SDGs 목표로 검색", async () => {
  const onOpen = jest.fn();
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await render(<PartnerSwiper testID="partners" slides={[...slides, SAMPLE]} t={t} onOpen={onOpen} />);
  const slide = within(screen.getByTestId(`partners-slide-${SAMPLE.id}`));
  expect(slide.getByText("サンプル")).toBeOnTheScreen();
  expect(slide.getByText("関連するクエストを見る")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId(`partners-slide-${SAMPLE.id}-cta`));
  expect(onOpen).toHaveBeenCalledWith(SAMPLE.sdgIds);
  expect(openURL).not.toHaveBeenCalled();
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
