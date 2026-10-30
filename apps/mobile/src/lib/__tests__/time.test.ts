// 동작 기록에 남기는 시각: "YYYY-MM-DDTHH:mm" (기기의 현지 시각).
import { nowIso } from "../time";

test("현재 시각을 분 단위 ISO 형태로", () => {
  expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});
