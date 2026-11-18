import { describe, expect, it } from "vitest";
import { loopJump, positionOf, realIndex, settlePosition, startPosition, SWIPE_RATIO, trackItems } from "./carousel";

describe("저절로 넘어가는 배너(Swiper 처럼)의 계산", () => {
  it("두 장 이상이면 트랙 앞뒤에 복사본을 하나씩 둬요: [마지막, 1, 2, 첫 장]", () => {
    const items = trackItems(["A", "B"]);
    expect(items.map((t) => `${t.item}${t.clone ? "*" : ""}`)).toEqual(["B*", "A", "B", "A*"]);
    expect(items.map((t) => t.index)).toEqual([1, 0, 1, 0]);
    expect(startPosition(2)).toBe(1);
  });

  it("한 장뿐이면 복사본 없이 그대로", () => {
    expect(trackItems(["A"]).map((t) => t.clone)).toEqual([false]);
    expect(startPosition(1)).toBe(0);
    expect(realIndex(0, 1)).toBe(0);
    expect(loopJump(0, 1)).toBeNull();
  });

  it("위치 ↔ 실제 장 번호 (복사본은 같은 그림의 장)", () => {
    expect([0, 1, 2, 3].map((p) => realIndex(p, 2))).toEqual([1, 0, 1, 0]);
    expect([0, 1, 2].map((i) => positionOf(i, 3))).toEqual([1, 2, 3]);
  });

  it("복사본에 도착하면 진짜 칸으로 순간 이동해요 — 마지막 다음은 첫 장, 첫 장 앞은 마지막 장", () => {
    expect(loopJump(3, 2)).toBe(1);
    expect(loopJump(0, 2)).toBe(2);
    expect(loopJump(1, 2)).toBeNull();
    expect(loopJump(2, 2)).toBeNull();
  });

  it("손을 뗄 때: 폭의 일정 비율 이상 끌면 다음(왼쪽으로) · 앞(오른쪽으로) 장, 아니면 제자리", () => {
    const w = 400;
    const enough = w * SWIPE_RATIO;
    expect(settlePosition(1, -enough, w, 2)).toBe(2);
    expect(settlePosition(1, enough, w, 2)).toBe(0);
    expect(settlePosition(1, -enough + 1, w, 2)).toBe(1);
    expect(settlePosition(2, -w, w, 2)).toBe(3);
    expect(settlePosition(3, -w, w, 2)).toBe(3);
    expect(settlePosition(1, -w, 0, 2)).toBe(1);
  });
});
