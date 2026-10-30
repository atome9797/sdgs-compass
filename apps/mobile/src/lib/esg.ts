// ESG 리포트·SDGs 인증마크 화면의 표시 도우미: 만점 기준 글자, 영역 점수 막대 비율, 입력 칸 종류.
import { formatNumber } from "@sdgs-compass/core/format";
import type { CertItemVM } from "@sdgs-compass/core/selectors";

/** 0/1 로 답하는 항목(SDGs 방침 공개)은 숫자 칸 대신 스위치로 보여요 */
export function isFlagItem(item: Pick<CertItemVM, "unit">): boolean {
  return item.unit === "flag";
}

/** "만점의 목표: {target}{unit}" 문구에 넣을 값. 스위치 항목은 목표를 따로 안내하지 않아서 null */
export function targetParams(item: Pick<CertItemVM, "unit" | "unitLabel" | "target">): { target: string; unit: string } | null {
  if (isFlagItem(item)) return null;
  return { target: formatNumber(item.target), unit: item.unitLabel };
}

/** 영역별 달성도(0~100)를 막대 비율(0~1)로 */
export function categoryRatio(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(1, Math.max(0, score / 100));
}
