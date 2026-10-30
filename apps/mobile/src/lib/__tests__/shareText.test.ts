// 카드뉴스 공유: 공유 메뉴에 넘길 글, 해시태그 나누기, "앱 내 저장" 포인트.
import { MAX_SHARE_ACTIVITIES, SHARE_POINTS } from "@sdgs-compass/core/impact";
import { MESSAGES } from "@sdgs-compass/core/messages";
import type { ShareCard } from "@sdgs-compass/core/shareCard";
import { hashtagList, savePoints, sharePayload, TEMPLATE_LABEL_KEY } from "../shareText";

test("공유 메뉴에는 제목과 SNS 에 올릴 글 전체를 넘겨요", () => {
  const card = { headline: "플라스틱 쓰레기 감축 해커톤", caption: "우수상을 수상했어요! #SDGs컴파스" } as ShareCard;
  expect(sharePayload(card)).toEqual({ title: "플라스틱 쓰레기 감축 해커톤", message: "우수상을 수상했어요! #SDGs컴파스" });
});

test("해시태그를 낱개로 나눠요", () => {
  expect(hashtagList("#SDGs컴파스 #SDGs #SDGs14")).toEqual(["#SDGs컴파스", "#SDGs", "#SDGs14"]);
  expect(hashtagList("  #a   b  #c ")).toEqual(["#a", "#c"]);
  expect(hashtagList("")).toEqual([]);
});

test("템플릿마다 이름 문구가 있어요", () => {
  expect(Object.keys(TEMPLATE_LABEL_KEY).sort()).toEqual(["instagram", "linkedin"]);
  for (const key of Object.values(TEMPLATE_LABEL_KEY)) expect(Object.keys(MESSAGES)).toContain(key);
});

test("앱 내 저장 포인트: 공유 실적이 한도(MAX_SHARE_ACTIVITIES)에 이르면 더 쌓이지 않아요", () => {
  expect(savePoints(0)).toBe(SHARE_POINTS);
  expect(savePoints(MAX_SHARE_ACTIVITIES - 1)).toBe(SHARE_POINTS);
  expect(savePoints(MAX_SHARE_ACTIVITIES)).toBe(0);
  expect(savePoints(MAX_SHARE_ACTIVITIES + 3)).toBe(0);
});
