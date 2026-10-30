// 동작(action)에 붙이는 시각. reducer 는 시각을 직접 읽지 않고 이 값을 받아서, 같은 입력이면 늘 같은 결과를 내요.
import { toIsoDateTime } from "@sdgs-compass/core/format";

/** 지금 시각 "YYYY-MM-DDTHH:mm" (기기의 현지 시각) */
export function nowIso(): string {
  return toIsoDateTime(new Date());
}
