"use client";

// 그래프를 담은 칸의 폭(px)을 재요. 첫 측정 전에는 0 이라서 그래프를 그리지 않고 높이만 비워 둬요
// (엉뚱한 폭으로 한 번 그려졌다가 바뀌는 깜빡임·가로 넘침을 막으려고). 폭은 ResizeObserver 콜백에서 바꿔서 렌더링 중에는 DOM 을 읽지 않아요.
import { useEffect, useRef, useState } from "react";

export function useChartWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      setWidth((previous) => (previous === next ? previous : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
