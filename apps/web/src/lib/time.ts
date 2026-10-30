import { toIsoDateTime } from "@sdgs-compass/core/format";

/** 지금 시각 "YYYY-MM-DDTHH:mm" — 동작(클릭)을 처리할 때만 불러요. 렌더링 중에는 부르지 않아요(같은 입력에 같은 화면). */
export function nowIso(): string {
  return toIsoDateTime(new Date());
}
