// 카드뉴스 글을 복사·공유하는 로직. 브라우저 기능(navigator.clipboard, navigator.share)은 env 로 받아서 가짜로 바꿔 테스트해요.
// 순서: 공유 메뉴(navigator.share) → 안 되면 클립보드 → 안 되면 예전 방식(execCommand) → 그래도 안 되면 실패(직접 복사하도록 안내).

export interface ClipboardEnv {
  /** navigator.clipboard.writeText — 보안 컨텍스트(https·localhost)에서만 있어요 */
  writeText?: (text: string) => Promise<void>;
  /** 예전 방식(document.execCommand("copy")). 성공하면 true */
  legacyCopy?: (text: string) => boolean;
}

export type CopyResult = "clipboard" | "legacy" | "failed";

export async function copyText(text: string, env: ClipboardEnv): Promise<CopyResult> {
  if (env.writeText) {
    try {
      await env.writeText(text);
      return "clipboard";
    } catch {
      // 권한이 거부됐거나 포커스가 없으면 다음 방법으로
    }
  }
  if (env.legacyCopy) {
    try {
      if (env.legacyCopy(text)) return "legacy";
    } catch {
      // 다음으로
    }
  }
  return "failed";
}

export interface ShareData {
  title?: string;
  text: string;
}

export interface ShareEnv {
  /** navigator.share (휴대폰 브라우저·일부 데스크톱에만 있어요) */
  share?: (data: ShareData) => Promise<void>;
  clipboard: ClipboardEnv;
}

export type ShareResult = "shared" | "cancelled" | "copied" | "failed";

export function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

/** 공유 메뉴가 있으면 쓰고(사용자가 닫으면 cancelled), 없거나 실패하면 복사로 대신해요 */
export async function shareOrCopy(data: ShareData, env: ShareEnv): Promise<ShareResult> {
  if (env.share) {
    try {
      await env.share(data);
      return "shared";
    } catch (error) {
      if (isAbortError(error)) return "cancelled";
    }
  }
  return (await copyText(data.text, env.clipboard)) === "failed" ? "failed" : "copied";
}

// ───────── 브라우저 연결(클릭할 때만 불러요 — 서버 렌더링 중에는 호출하지 않아요) ─────────

function legacyCopyViaTextarea(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(area);
  }
}

export function browserClipboardEnv(): ClipboardEnv {
  const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  return {
    writeText: clip && typeof clip.writeText === "function" ? (text) => clip.writeText(text) : undefined,
    legacyCopy: typeof document !== "undefined" ? legacyCopyViaTextarea : undefined,
  };
}

export function browserShareEnv(): ShareEnv {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return {
    share: canShare ? (data) => navigator.share(data) : undefined,
    clipboard: browserClipboardEnv(),
  };
}
