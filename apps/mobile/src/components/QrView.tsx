// QR 코드(데모): core 가 만든 모듈 행렬을 View 막대로 그려요. 사방에 흰 여백(quiet zone)을 둬서 휴대폰 카메라가 읽을 수 있는 모양이에요.
// 실제 QR 인식·블록체인 연동은 Phase 2 예정이라, 화면에도 "표시용 데모"라고 밝혀요(cert.qrNote).
import { View } from "react-native";
import { qrLayout } from "@/lib/geometry";
import { COLORS } from "@/theme";

export interface QrViewProps {
  matrix: readonly (readonly boolean[])[];
  /** 흰 여백을 포함해 이 길이(dp) 안에 그려요 */
  size: number;
  accessibilityLabel: string;
}

export function QrView({ matrix, size, accessibilityLabel }: QrViewProps) {
  const layout = qrLayout(matrix, size);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: layout.size, height: layout.size, backgroundColor: "#FFFFFF" }}>
      {layout.rects.map((rect) => (
        <View
          key={`${rect.x}-${rect.y}`}
          style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height, backgroundColor: COLORS.text }}
        />
      ))}
    </View>
  );
}
