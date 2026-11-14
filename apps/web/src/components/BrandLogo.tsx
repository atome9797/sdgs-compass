// 앱 로고(#44): 밧줄을 감은 놋쇠 나침반과 밤바다(core/brand.ts 의 48×48 픽셀 그림) — 왼쪽 위 · 언어 선택 · 시작 화면 · 카드뉴스.
// PNG 데이터 URI 는 모듈을 읽을 때 한 번만 만들고, CSS 배경(pixelated)으로 보여 줘요. 장식이라 화면 읽기 프로그램은 건너뛰어요.
import { compassLogo } from "@sdgs-compass/core/brand";
import { pngDataUri } from "@sdgs-compass/core/png";

const LOGO_URI = pngDataUri(compassLogo(), 2);

export function BrandLogo({ className }: { className: string }) {
  return <span className={`brand-logo ${className}`} aria-hidden="true" style={{ backgroundImage: `url("${LOGO_URI}")` }} />;
}
