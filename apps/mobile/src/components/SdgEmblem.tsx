// SDG 목표의 스킬 문장(#42): core 의 16×16 픽셀 그림을 PNG 데이터 URI 로 만들어 <Image> 로 보여 줘요(웹과 같은 그림).
// 미리 6배로 키운 PNG 라서 칸이 번지지 않아요. 목표마다 한 번만 만들어요. 공식 SDG 아이콘이 아니라 이 앱이 그린 그림이에요.
import { Image } from "react-native";
import { sdgEmblem } from "@sdgs-compass/core/emblems";
import { pngDataUri } from "@sdgs-compass/core/png";
import type { SdgId } from "@sdgs-compass/core/sdg";

const PNG_SCALE = 6;
const cache = new Map<SdgId, string>();

export function emblemPng(id: SdgId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const uri = pngDataUri(sdgEmblem(id), PNG_SCALE);
  cache.set(id, uri);
  return uri;
}

export interface SdgEmblemProps {
  id: SdgId;
  size: number;
  /** 있으면 그림 자체를 읽어요. 없으면 장식(화면 읽기 프로그램은 건너뛰어요) */
  accessibilityLabel?: string;
  testID?: string;
}

export function SdgEmblem({ id, size, accessibilityLabel, testID }: SdgEmblemProps) {
  return (
    <Image
      testID={testID}
      source={{ uri: emblemPng(id) }}
      style={{ width: size, height: size }}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
    />
  );
}
