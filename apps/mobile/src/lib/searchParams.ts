// 홈에서 검색 탭으로(검색어·SDGs 칩을 채워서) 넘어갈 때 쓰는 경로 매개변수 만들기·읽기.
// n(nonce)은 같은 값으로 다시 넘어가도 "새 요청"으로 알아차리게 하는 번호예요.
import { isSdgId, type SdgId } from "@sdgs-compass/core/sdg";

export interface SearchRequest {
  query: string;
  sdgIds: SdgId[];
  nonce: string;
}

export type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** router.navigate({ pathname: "/search", params }) 에 넣을 값 (빈 값은 빼요) */
export function searchParamsOf(request: { query?: string; sdgIds?: readonly SdgId[] }, nonce: string): Record<string, string> {
  const params: Record<string, string> = { n: nonce };
  const query = (request.query ?? "").trim();
  if (query !== "") params.q = query;
  if (request.sdgIds && request.sdgIds.length > 0) params.sdg = request.sdgIds.join(",");
  return params;
}

/** useLocalSearchParams 의 값을 읽어요 (모르는 SDGs 번호·중복은 버려요) */
export function parseSearchParams(raw: RawParams): SearchRequest {
  const ids: SdgId[] = [];
  for (const part of first(raw.sdg).split(",")) {
    const id = Number(part);
    if (isSdgId(id) && !ids.includes(id)) ids.push(id);
  }
  return { query: first(raw.q), sdgIds: ids, nonce: first(raw.n) };
}
