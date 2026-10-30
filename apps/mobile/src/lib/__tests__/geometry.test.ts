// 레이더 차트·QR 을 View 로 그리기 위한 계산: 선분·점 스타일, 차트 영역, QR 막대 묶기, 화면 폭에 맞춘 크기.
import { PHONE_WIDTH, SPACE } from "@sdgs-compass/core/theme";
import { contentWidthFor, dotStyle, qrLayout, radarGeometry, segmentStyle, squareSizeFor } from "../geometry";

test("선분 하나 = 가운데를 선분의 가운데에 두고 회전한 얇은 막대", () => {
  expect(segmentStyle({ cx: 100, cy: 50, length: 40, angleDeg: 30 }, 2)).toEqual({
    position: "absolute",
    left: 80,
    top: 49,
    width: 40,
    height: 2,
    transform: [{ rotate: "30deg" }],
  });
});

test("점 하나 = 가운데를 점에 둔 동그라미", () => {
  expect(dotStyle({ x: 10, y: 20 }, 6)).toEqual({ position: "absolute", left: 7, top: 17, width: 6, height: 6, borderRadius: 3 });
});

test("레이더 차트 영역: 가장자리에 축 번호 글자 여백을 남겨요", () => {
  const geometry = radarGeometry(300);
  expect(geometry).toMatchObject({ size: 300, cx: 150, cy: 150, radius: 128 });
  expect(geometry.labelRadius).toBeGreaterThan(geometry.radius);
  expect(geometry.labelRadius).toBeLessThan(150);
  expect(radarGeometry(30).radius).toBe(0);
  expect(radarGeometry(300, 10).radius).toBe(140);
});

test("QR: 이어진 어두운 칸을 한 줄 막대로 묶고 사방에 흰 여백 4칸", () => {
  const matrix = [
    [true, true, false],
    [false, true, true],
    [true, false, true],
  ];
  const layout = qrLayout(matrix, 100);
  expect(layout.quiet).toBe(4);
  expect(layout.cell).toBe(9); // floor(100 / (3 + 8))
  expect(layout.size).toBe(99);
  expect(layout.rects).toEqual([
    { x: 36, y: 36, width: 18, height: 9 },
    { x: 45, y: 45, width: 18, height: 9 },
    { x: 36, y: 54, width: 9, height: 9 },
    { x: 54, y: 54, width: 9, height: 9 },
  ]);
});

test("QR: 막대가 덮는 칸 수는 어두운 칸 수와 같고, 목표 크기를 넘지 않아요", () => {
  const matrix = Array.from({ length: 21 }, (_, row) => Array.from({ length: 21 }, (_, col) => (row * 7 + col * 3) % 5 < 2));
  const dark = matrix.flat().filter(Boolean).length;
  const layout = qrLayout(matrix, 240);
  expect(layout.rects.reduce((sum, rect) => sum + rect.width / layout.cell, 0)).toBe(dark);
  expect(layout.size).toBeLessThanOrEqual(240);
  expect(layout.rects.every((rect) => rect.x >= layout.quiet * layout.cell && rect.x + rect.width <= layout.size - layout.quiet * layout.cell)).toBe(true);
  expect(qrLayout([[false]], 100).rects).toEqual([]);
  expect(qrLayout(matrix, 5).cell).toBe(1);
});

test("카드 안 정사각형 그림의 한 변: 화면 폭에서 여백을 빼고 min~max 사이로", () => {
  expect(squareSizeFor(390)).toBe(326);
  expect(squareSizeFor(1000)).toBe(Math.min(340, PHONE_WIDTH - SPACE.lg * 4));
  expect(squareSizeFor(200)).toBe(220);
  expect(squareSizeFor(Number.NaN)).toBe(Math.min(340, Math.max(220, PHONE_WIDTH - SPACE.lg * 4)));
  expect(squareSizeFor(390, 180, 240)).toBe(240);
  expect(squareSizeFor(200, 180, 240)).toBe(180);
});

test("본문 폭: 휴대폰 폭까지에서 좌우 여백을 뺀 값 (너무 좁아도 200 이상)", () => {
  expect(contentWidthFor(390)).toBe(358);
  expect(contentWidthFor(2000)).toBe(PHONE_WIDTH - SPACE.lg * 2);
  expect(contentWidthFor(100)).toBe(200);
  expect(contentWidthFor(Number.NaN)).toBe(PHONE_WIDTH - SPACE.lg * 2);
});
