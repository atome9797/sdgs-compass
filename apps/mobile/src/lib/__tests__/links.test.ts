// 동영상 주소 칸: http(s) 주소만 열어요.
import { isHttpUrl } from "../links";

test("http·https 주소", () => {
  expect(isHttpUrl("https://example.com/pitch")).toBe(true);
  expect(isHttpUrl("http://example.com")).toBe(true);
  expect(isHttpUrl("HTTPS://EXAMPLE.COM/a?b=1#c")).toBe(true);
  expect(isHttpUrl("  https://example.com/pitch  ")).toBe(true);
});

test("그 밖의 글자는 주소로 보지 않아요", () => {
  expect(isHttpUrl("")).toBe(false);
  expect(isHttpUrl("https://")).toBe(false);
  expect(isHttpUrl("https://a b")).toBe(false);
  expect(isHttpUrl("ftp://example.com")).toBe(false);
  expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  expect(isHttpUrl("example.com")).toBe(false);
  expect(isHttpUrl("not a url")).toBe(false);
});
