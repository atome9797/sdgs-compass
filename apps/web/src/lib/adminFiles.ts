// 운영자 화면의 파일 주고받기(브라우저 전용): CSV·JSON 을 내려받고, 고른 파일을 글자로 읽어요. 서버로는 아무것도 보내지 않아요.

/** 이보다 큰 파일은 읽지 않아요 (CSV·JSON 은 아무리 커도 이 정도예요. 실수로 큰 파일을 고른 경우를 막아요) */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** 글자를 파일로 내려받게 해요 (클릭 같은 동작을 처리하는 곳에서만 불러요) */
export function downloadTextFile(filename: string, text: string, mime = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 바로 지우면 일부 브라우저에서 내려받기가 끊겨서, 잠깐 뒤에 지워요
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ReadFileResult = { ok: true; text: string } | { ok: false; reason: "too_large" | "unreadable" };

/** 고른 파일을 글자로 읽어요. 너무 크거나 읽을 수 없으면 이유를 돌려줘요 (예외를 던지지 않아요) */
export async function readTextFile(file: File): Promise<ReadFileResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, reason: "too_large" };
  try {
    return { ok: true, text: await file.text() };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
