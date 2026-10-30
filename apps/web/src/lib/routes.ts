// 화면 주소 모음과 순수 함수들(경로 만들기·basePath·경로 가드). 브라우저 없이 테스트해요.
// 정적 내보내기(GitHub Pages)를 위해 동적 경로([id])를 쓰지 않아요. 상세 화면은 쿼리(?id=)로 구분하고, 주소는 항상 슬래시로 끝나요.
import type { Role } from "@sdgs-compass/core/domain";
import { isSdgId, type SdgId } from "@sdgs-compass/core/sdg";

export const ROUTES = {
  root: "/",
  home: "/home",
  search: "/search",
  challenge: "/challenge",
  submit: "/challenge/submit",
  impact: "/impact",
  certificate: "/certificate",
  share: "/share",
  messages: "/messages",
  /** SNS 피드(F-503·F-504): 학생용 목록과 자랑 글 쓰기 */
  feed: "/feed",
  feedNew: "/feed/new",
  settings: "/settings",
  b2b: "/b2b",
  b2bNew: "/b2b/new",
  b2bApplicants: "/b2b/applicants",
  b2bTalent: "/b2b/talent",
  b2bEsg: "/b2b/esg",
  /** 기업용 피드 목록과 홍보 글 쓰기 */
  b2bFeed: "/b2b/feed",
  b2bFeedNew: "/b2b/feed/new",
  b2bSettings: "/b2b/settings",
} as const;
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export type QueryValue = string | number | null | undefined;
export type Query = Readonly<Record<string, QueryValue>>;

/** "/b2b/?x=1#y" → "/b2b", "/" → "/" (쿼리·해시를 떼고 끝 슬래시를 통일해서 비교하기 쉽게) */
export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0] ?? "";
  const withLead = clean.startsWith("/") ? clean : `/${clean}`;
  const trimmed = withLead.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** NEXT_PUBLIC_BASE_PATH 를 "" 또는 "/sdgs-compass" 모양으로 (앞 슬래시 하나, 뒤 슬래시 없음) */
export function normalizeBasePath(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "" : `/${trimmed}`;
}

/** 현재 빌드의 basePath. NEXT_PUBLIC_ 값은 빌드할 때 코드에 박혀요(반드시 이 모양 그대로 읽어야 해요). */
export function currentBasePath(): string {
  return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
}

/** 경로 앞의 basePath 를 떼요 ("/sdgs-compass/home/" → "/home/"). basePath 로 시작하지 않으면 그대로 */
export function stripBasePath(pathname: string, basePath: string): string {
  const base = normalizeBasePath(basePath);
  if (base === "") return pathname;
  if (pathname === base) return "/";
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

/**
 * next/link·router 에 넘기는 앱 안 주소: 슬래시로 끝나고 쿼리가 붙어요 ("/challenge/?id=ch-plastic").
 * basePath 는 Next 가 알아서 붙여 주니 여기서는 붙이지 않아요.
 */
export function buildHref(path: RoutePath, query?: Query): string {
  const base = path === "/" ? "/" : `${path}/`;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length === 0 ? base : `${base}?${parts.join("&")}`;
}

/** Next 가 손대지 않는 "원본 주소"(manifest 아이콘, <img>, 직접 만든 <a>)에는 basePath 를 직접 붙여요 */
export function withBase(path: string, basePath: string = currentBasePath()): string {
  const base = normalizeBasePath(basePath);
  const lead = path.startsWith("/") ? path : `/${path}`;
  return `${base}${lead}`;
}

export const challengeHref = (id: string): string => buildHref(ROUTES.challenge, { id });
export const submitHref = (id: string): string => buildHref(ROUTES.submit, { id });
/** 최종 제출 뒤 수령증 화면 (다시 열어도 같은 화면이 나와요) */
export const receiptHref = (id: string): string => buildHref(ROUTES.submit, { id, receipt: 1 });
export const certificateHref = (id?: string): string => buildHref(ROUTES.certificate, { id });
export const applicantsHref = (id?: string): string => buildHref(ROUTES.b2bApplicants, { id });
export function searchHref(opts: { q?: string; sdgIds?: readonly SdgId[] } = {}): string {
  return buildHref(ROUTES.search, { q: opts.q, sdg: opts.sdgIds && opts.sdgIds.length > 0 ? opts.sdgIds.join(",") : undefined });
}
/** 피드 주소 (학생 /feed/, 기업 /b2b/feed/). posted = 방금 올린 글의 id — 피드가 "올렸어요" 안내를 보여 주고 그 글을 강조해요 */
export const feedHref = (role: Role, posted?: string | null): string => buildHref(role === "b2b" ? ROUTES.b2bFeed : ROUTES.feed, { posted });
/** 글쓰기 주소: 학생은 올릴 실적(activity), 기업은 연결할 챌린지(challenge)를 미리 골라 둔 채로 열어요 */
export const postNewHref = (role: Role, presetId?: string | null): string =>
  role === "b2b" ? buildHref(ROUTES.b2bFeedNew, { challenge: presetId }) : buildHref(ROUTES.feedNew, { activity: presetId });
/** 카드뉴스 화면 (실적 하나를 미리 골라 두고 열 수 있어요) */
export const shareHref = (activityId?: string | null): string => buildHref(ROUTES.share, { activity: activityId });

/** "14,12,abc,99,14" → [14, 12] (숫자가 아니거나 1~17 밖이거나 겹치면 버려요) */
export function parseSdgParam(raw: string | null | undefined): SdgId[] {
  const ids: SdgId[] = [];
  for (const part of (raw ?? "").split(",")) {
    const n = Number(part.trim());
    if (isSdgId(n) && !ids.includes(n)) ids.push(n);
  }
  return ids;
}

// ───────── 역할별 영역과 경로 가드 ─────────

export type Area = "b2c" | "b2b" | "neutral";

const B2C_PATHS: readonly string[] = [ROUTES.home, ROUTES.search, ROUTES.challenge, ROUTES.submit, ROUTES.impact, ROUTES.certificate, ROUTES.share, ROUTES.messages, ROUTES.feed, ROUTES.feedNew, ROUTES.settings];

export function areaOf(path: string): Area {
  const p = normalizePath(path);
  if (p === ROUTES.b2b || p.startsWith(`${ROUTES.b2b}/`)) return "b2b";
  return B2C_PATHS.includes(p) ? "b2c" : "neutral";
}

export const homeFor = (role: Role): string => (role === "b2b" ? buildHref(ROUTES.b2b) : buildHref(ROUTES.home));

/**
 * 지금 주소(usePathname 값)와 역할로 "옮겨야 할 주소"를 정해요. 옮길 필요가 없으면 null.
 * b2c ⇒ 학생 화면만, b2b ⇒ /b2b/* 만. 루트(/)는 역할의 홈으로. 역할을 아직 안 골랐으면 게이트가 화면을 가리므로 그대로 둬요.
 * pathname 은 basePath 가 빠진 값(Next 의 usePathname)이어도, 붙은 값이어도 돼요.
 */
export function guardRedirect(pathname: string, role: Role | null, basePath = ""): string | null {
  if (role === null) return null;
  const path = normalizePath(stripBasePath(pathname, basePath));
  if (path === "/") return homeFor(role);
  const area = areaOf(path);
  if (area === "b2c" && role === "b2b") return homeFor("b2b");
  if (area === "b2b" && role === "b2c") return homeFor("b2c");
  return null;
}
