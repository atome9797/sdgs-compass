import { qrPath } from "@/lib/qrSvg";

/** QR 모듈 행렬을 SVG 로 그려요 (여백 4칸 포함, 흰 바탕). 표시용 데모 — 실제 인식·블록체인 연동은 Phase 2 */
export function QrCode({ matrix, label }: { matrix: readonly (readonly boolean[])[]; label: string }) {
  const { size, d } = qrPath(matrix);
  return (
    <div className="qr">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <rect width={size} height={size} fill="#FFFFFF" />
        <path d={d} fill="#10161F" />
      </svg>
    </div>
  );
}
