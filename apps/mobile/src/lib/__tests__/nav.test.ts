// 경로 만들기·경로 매개변수 읽기·뒤로 가기.
import {
  applicantsHref,
  certificateHref,
  challengeHref,
  composeHref,
  feedRoute,
  goBack,
  paramText,
  postedHref,
  receiptHref,
  ROUTES,
  shareHref,
  submitHref,
  type BackRouter,
} from "../nav";

test("고정 경로", () => {
  expect(ROUTES.home).toBe("/");
  expect(ROUTES.b2bDashboard).toBe("/b2b");
  expect(Object.values(ROUTES).every((href) => href.startsWith("/"))).toBe(true);
  expect(new Set(Object.values(ROUTES)).size).toBe(Object.values(ROUTES).length);
});

test("SNS 피드 경로: 학생은 /feed, 기업은 /b2b/feed (글쓰기는 그 아래 new)", () => {
  expect(ROUTES.feed).toBe("/feed");
  expect(ROUTES.feedNew).toBe(`${ROUTES.feed}/new`);
  expect(ROUTES.b2bFeed).toBe(`${ROUTES.b2bDashboard}/feed`);
  expect(ROUTES.b2bFeedNew).toBe(`${ROUTES.b2bFeed}/new`);
});

test("id 가 들어가는 경로는 특수 문자를 안전하게 인코딩해요", () => {
  expect(challengeHref("ch-plastic")).toBe("/challenge/ch-plastic");
  expect(challengeHref("a b/c")).toBe("/challenge/a%20b%2Fc");
  expect(submitHref("ch-plastic")).toBe("/challenge/submit/ch-plastic");
  expect(certificateHref("SC-C-0001")).toBe("/certificate/SC-C-0001");
  expect(applicantsHref("ch-plastic")).toBe("/b2b/applicants?id=ch-plastic");
  expect(applicantsHref("a&b")).toBe("/b2b/applicants?id=a%26b");
});

test("카드뉴스 화면은 실적을 미리 골라서 열 수 있어요", () => {
  expect(shareHref()).toBe("/share");
  expect(shareHref(null)).toBe("/share");
  expect(shareHref("")).toBe("/share");
  expect(shareHref("h-5b")).toBe("/share?activity=h-5b");
  expect(shareHref("a b&c")).toBe("/share?activity=a%20b%26c");
});

test("역할에 맞는 피드 탭", () => {
  expect(feedRoute("b2c")).toBe("/feed");
  expect(feedRoute("b2b")).toBe("/b2b/feed");
});

test("글쓰기 경로: 자랑 글은 학생 화면, 홍보 글은 기업 화면이고, 미리 고른 값이 있으면 매개변수로 붙어요", () => {
  expect(composeHref("brag")).toBe("/feed/new");
  expect(composeHref("pr")).toBe("/b2b/feed/new");
  expect(composeHref("brag", null)).toBe("/feed/new");
  expect(composeHref("pr", "")).toBe("/b2b/feed/new");
  expect(composeHref("brag", "h-5b")).toBe("/feed/new?activity=h-5b");
  expect(composeHref("pr", "ch-bottle")).toBe("/b2b/feed/new?challenge=ch-bottle");
  expect(composeHref("pr", "a&b")).toBe("/b2b/feed/new?challenge=a%26b");
});

test("글을 올린 뒤 가는 곳: 쓴 계정의 피드 탭에 posted=1 (기업 글은 official·channel 도: 신청한 날짜와 채널, 안 했으면 빈 값)", () => {
  expect(postedHref("b2c", null)).toBe("/feed?posted=1");
  expect(postedHref("b2b", null)).toBe("/b2b/feed?posted=1&official=&channel=");
  expect(postedHref("b2b", { on: "2026-11-02", channel: "instagram" })).toBe("/b2b/feed?posted=1&official=2026-11-02&channel=instagram");
  expect(postedHref("b2b", { on: "2026-11-02", channel: "x" })).toBe("/b2b/feed?posted=1&official=2026-11-02&channel=x");
  expect(postedHref("b2b", { on: "2026-11-03", channel: "facebook" })).toBe("/b2b/feed?posted=1&official=2026-11-03&channel=facebook");
});

test("수령증은 제출 화면과 같은 경로에 receipt=1 을 붙여요", () => {
  expect(receiptHref("ch-plastic")).toBe("/challenge/submit/ch-plastic?receipt=1");
});

test("경로 매개변수를 글자 하나로 읽어요", () => {
  expect(paramText("abc")).toBe("abc");
  expect(paramText(["first", "second"])).toBe("first");
  expect(paramText([])).toBe("");
  expect(paramText(undefined)).toBe("");
});

function fakeRouter(canGoBack: boolean) {
  const calls: string[] = [];
  const router: BackRouter = {
    canGoBack: () => canGoBack,
    back: () => void calls.push("back"),
    replace: (href: string) => void calls.push(`replace:${href}`),
  };
  return { router, calls };
}

test("뒤로 갈 수 있으면 뒤로", () => {
  const { router, calls } = fakeRouter(true);
  goBack(router, "/b2b");
  expect(calls).toEqual(["back"]);
});

test("처음 열린 화면이라 갈 곳이 없으면 대체 경로로 바꿔 열어요", () => {
  const { router, calls } = fakeRouter(false);
  goBack(router, "/b2b");
  expect(calls).toEqual(["replace:/b2b"]);
});
