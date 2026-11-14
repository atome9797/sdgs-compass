"use client";

// 「움직임 줄이기」(OS 설정 prefers-reduced-motion) — 켜져 있으면 전투 화면의 등장 · 흔들림 · 불꽃 · 글자 타자 효과를 끄고 끝난 모습만 보여 줘요.
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getSnapshot = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(QUERY).matches : false);
// 정적 내보내기의 서버 그리기에서는 움직임이 있는 쪽으로 (화면을 열면 브라우저 설정으로 다시 그려요)
const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
