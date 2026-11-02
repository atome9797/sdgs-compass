import { pointsAttr, radarPolygon, radarRing, radarVertex } from "@sdgs-compass/core/radar";
import { type SdgId } from "@sdgs-compass/core/sdg";
import { COLORS, tint } from "@sdgs-compass/core/theme";

export interface RadarDatum {
  id: SdgId;
  score: number;
  color: string;
}

const SIZE = 340;
const C = SIZE / 2;
const R = 116;
const LABEL_R = R + 21;
const RINGS = [0.25, 0.5, 0.75, 1];

/** 17개 SDGs 레이더 차트 (core/radar.ts 의 좌표). 축 끝에는 SDG 색 번호 원, 안쪽은 0~100 점수 다각형 */
export function RadarChart({ data, label }: { data: readonly RadarDatum[]; label: string }) {
  const count = data.length;
  const polygon = radarPolygon(data.map((d) => d.score), 100, R, C, C);
  return (
    <figure>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
        {RINGS.map((fraction) => (
          <polygon key={fraction} points={pointsAttr(radarRing(count, fraction, R, C, C))} fill={fraction === 1 ? COLORS.bg : "none"} stroke={COLORS.border} strokeWidth={fraction === 1 ? 1.5 : 1} />
        ))}
        {data.map((d, i) => {
          const end = radarVertex(i, count, R, C, C);
          return <line key={d.id} x1={C} y1={C} x2={end.x} y2={end.y} stroke={COLORS.border} strokeWidth={1} />;
        })}
        <text x={C + 4} y={C - R * 0.5 - 3} fontSize="9" fill={COLORS.textMuted}>
          50
        </text>
        <text x={C + 4} y={C - R - 3} fontSize="9" fill={COLORS.textMuted}>
          100
        </text>
        <polygon points={pointsAttr(polygon)} fill={tint(COLORS.primary, 0.3)} fillOpacity={0.85} stroke={COLORS.primary} strokeWidth={2.5} strokeLinejoin="round" />
        {polygon.map((p, i) => (data[i].score > 0 ? <circle key={data[i].id} cx={p.x} cy={p.y} r={4} fill={data[i].color} stroke="#fff" strokeWidth={1.5} /> : null))}
        {data.map((d, i) => {
          const p = radarVertex(i, count, LABEL_R, C, C);
          return (
            <g key={d.id}>
              <circle cx={p.x} cy={p.y} r={11} fill={tint(d.color, 0.16)} stroke={d.color} strokeWidth={2} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="11.5" fontWeight="800" fill={COLORS.text}>
                {d.id}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        <ul>
          {data.map((d) => (
            <li key={d.id}>
              {d.id}: {d.score}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
