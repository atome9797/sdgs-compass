// SVG 없이 그리는 도형의 좌표 계산: 레이더 차트의 선(회전한 얇은 View)과 QR 코드(어두운 칸을 가로 막대로 묶은 View).
// 순수 함수라서 화면과 따로 테스트해요. 그리는 쪽은 components/RadarChart.tsx, components/QrView.tsx.
import type { Point, Segment } from "@sdgs-compass/core/radar";
import { PHONE_WIDTH, SPACE } from "@sdgs-compass/core/theme";
import type { ViewStyle } from "react-native";

/** 선분 하나를 그리는 View 의 스타일: 가운데를 선분의 가운데에 두고 회전해요 */
export function segmentStyle(segment: Segment, thickness: number): ViewStyle {
  return {
    position: "absolute",
    left: segment.cx - segment.length / 2,
    top: segment.cy - thickness / 2,
    width: segment.length,
    height: thickness,
    transform: [{ rotate: `${segment.angleDeg}deg` }],
  };
}

/** 점 하나를 그리는 동그란 View 의 스타일 */
export function dotStyle(point: Point, diameter: number): ViewStyle {
  return {
    position: "absolute",
    left: point.x - diameter / 2,
    top: point.y - diameter / 2,
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
  };
}

export interface RadarGeometry {
  size: number;
  cx: number;
  cy: number;
  /** 가장 바깥 격자의 반지름 */
  radius: number;
  /** 축 번호 글자를 놓는 반지름 */
  labelRadius: number;
}

/** 정사각형 size 안에 레이더 차트를 놓아요: 가장자리에는 축 번호 글자를 놓을 여백(labelMargin)을 남겨요 */
export function radarGeometry(size: number, labelMargin = 22): RadarGeometry {
  const center = size / 2;
  const radius = Math.max(0, center - labelMargin);
  return { size, cx: center, cy: center, radius, labelRadius: radius + labelMargin * 0.58 };
}

export interface QrRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QrLayout {
  /** 흰 여백(quiet zone)을 포함한 한 변 길이 */
  size: number;
  /** 한 칸의 한 변 길이 */
  cell: number;
  /** 사방의 흰 여백 칸 수 */
  quiet: number;
  /** 어두운 칸을 그리는 가로 막대들 (좌표는 여백 포함) */
  rects: QrRect[];
}

/**
 * QR 행렬(true = 어두운 칸)을 target 길이 안에 그릴 막대들로 바꿔요.
 * 한 줄에서 이어진 어두운 칸을 막대 하나로 묶어서 View 수를 줄이고, 칸은 정수 길이로 맞춰 가장자리가 또렷해요.
 * QR 규격은 사방에 4칸 이상의 흰 여백(quiet zone)을 요구해서 기본값이 4예요.
 */
export function qrLayout(matrix: readonly (readonly boolean[])[], target: number, quiet = 4): QrLayout {
  const count = matrix.length;
  const modules = count + quiet * 2;
  const cell = Math.max(1, Math.floor(target / modules));
  const rects: QrRect[] = [];
  for (let row = 0; row < count; row++) {
    let col = 0;
    while (col < count) {
      if (!matrix[row][col]) {
        col += 1;
        continue;
      }
      let end = col;
      while (end + 1 < count && matrix[row][end + 1]) end += 1;
      rects.push({ x: (col + quiet) * cell, y: (row + quiet) * cell, width: (end - col + 1) * cell, height: cell });
      col = end + 1;
    }
  }
  return { size: modules * cell, cell, quiet, rects };
}

/**
 * 카드 안에 넣는 정사각형 그림(레이더 차트·QR)의 한 변 길이.
 * 화면 폭(휴대폰 폭 PHONE_WIDTH 까지)에서 화면 좌우 여백과 카드 안쪽 여백을 빼고, min~max 사이로 맞춰요.
 */
export function squareSizeFor(windowWidth: number, min = 220, max = 340): number {
  const inner = Math.min(Number.isFinite(windowWidth) ? windowWidth : PHONE_WIDTH, PHONE_WIDTH) - SPACE.lg * 4;
  return Math.max(min, Math.min(max, Math.floor(inner)));
}

/** 화면 본문(좌우 여백 SPACE.lg 를 뺀 폭, 휴대폰 폭 PHONE_WIDTH 까지)의 폭: 카드뉴스 미리보기처럼 본문 폭을 꽉 채울 때 써요 */
export function contentWidthFor(windowWidth: number): number {
  const width = Math.min(Number.isFinite(windowWidth) ? windowWidth : PHONE_WIDTH, PHONE_WIDTH);
  return Math.max(200, Math.floor(width - SPACE.lg * 2));
}
