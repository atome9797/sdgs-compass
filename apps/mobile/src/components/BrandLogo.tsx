// 앱 로고(#44): 밧줄을 감은 놋쇠 나침반과 밤바다(core/brand.ts 의 48×48 픽셀 그림, 웹과 같은 그림).
// PNG 데이터 URI 는 모듈을 읽을 때 한 번만 만들어요(6배로 미리 키워서 칸이 번지지 않게). 장식이라 화면 읽기 프로그램은 건너뛰어요.
import { Image } from "react-native";
import { compassLogo } from "@sdgs-compass/core/brand";
import { pngDataUri } from "@sdgs-compass/core/png";

export const LOGO_URI = pngDataUri(compassLogo(), 6);

export function BrandLogo({ size, testID }: { size: number; testID?: string }) {
  return (
    <Image
      testID={testID}
      source={{ uri: LOGO_URI }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
