// 경로 만들기·경로 매개변수 읽기·뒤로 가기.
import { applicantsHref, certificateHref, challengeHref, goBack, paramText, receiptHref, ROUTES, submitHref, type BackRouter } from "../nav";

test("고정 경로", () => {
  expect(ROUTES.home).toBe("/");
  expect(ROUTES.b2bDashboard).toBe("/b2b");
  expect(Object.values(ROUTES).every((href) => href.startsWith("/"))).toBe(true);
  expect(new Set(Object.values(ROUTES)).size).toBe(Object.values(ROUTES).length);
});

test("id 가 들어가는 경로는 특수 문자를 안전하게 인코딩해요", () => {
  expect(challengeHref("ch-plastic")).toBe("/challenge/ch-plastic");
  expect(challengeHref("a b/c")).toBe("/challenge/a%20b%2Fc");
  expect(submitHref("ch-plastic")).toBe("/challenge/submit/ch-plastic");
  expect(certificateHref("SC-C-0001")).toBe("/certificate/SC-C-0001");
  expect(applicantsHref("ch-plastic")).toBe("/b2b/applicants?id=ch-plastic");
  expect(applicantsHref("a&b")).toBe("/b2b/applicants?id=a%26b");
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
