// 홈의 「모험 지도」 바탕(#57) 오른쪽 위 장식: 나침반 · 점선 항로 · 보물 표시(core/adventureMap.ts 의 픽셀 그림, 앱과 같은 그림).
// PNG 데이터 URI 는 모듈을 읽을 때 한 번만 만들고, CSS 배경(pixelated)으로 2배로 보여 줘요. 장식이라 화면 읽기 프로그램은 건너뛰어요.
import { MAP_DECOR, mapDecor } from "@sdgs-compass/core/adventureMap";
import { pngDataUri } from "@sdgs-compass/core/png";

const DECOR_URI = pngDataUri(mapDecor(), 1);

export function MapDecor() {
  return (
    <span
      className="map-decor"
      aria-hidden="true"
      style={{ backgroundImage: `url("${DECOR_URI}")`, width: MAP_DECOR.w * MAP_DECOR.scale, height: MAP_DECOR.h * MAP_DECOR.scale }}
    />
  );
}
