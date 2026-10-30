// UN SDGs 17목표: 번호·색(공개된 공식 색상값)·일본어/한국어 이름. 공식 로고·아이콘 이미지는 쓰지 않고, 번호를 넣은 색 타일로만 보여 줘요.
// (UN 공식 인증과 무관한 독자 서비스예요 — 앱 안에도 그렇게 밝혀요: certification.ts 의 CERT_DISCLAIMER)
import type { LocalizedText } from "./i18n";

export type SdgId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

export interface Sdg {
  readonly id: SdgId;
  /** 공식 색 (#RRGGBB) */
  readonly color: string;
  /** 정식 이름 */
  readonly name: LocalizedText;
  /** 타일에 넣는 짧은 이름 */
  readonly short: LocalizedText;
}

export const SDGS: readonly Sdg[] = [
  { id: 1, color: "#E5243B", name: { ja: "貧困をなくそう", ko: "빈곤 퇴치" }, short: { ja: "貧困", ko: "빈곤" } },
  { id: 2, color: "#DDA63A", name: { ja: "飢餓をゼロに", ko: "기아 종식" }, short: { ja: "飢餓", ko: "기아" } },
  { id: 3, color: "#4C9F38", name: { ja: "すべての人に健康と福祉を", ko: "건강과 웰빙" }, short: { ja: "保健", ko: "건강" } },
  { id: 4, color: "#C5192D", name: { ja: "質の高い教育をみんなに", ko: "양질의 교육" }, short: { ja: "教育", ko: "교육" } },
  { id: 5, color: "#FF3A21", name: { ja: "ジェンダー平等を実現しよう", ko: "성평등" }, short: { ja: "ジェンダー", ko: "성평등" } },
  { id: 6, color: "#26BDE2", name: { ja: "安全な水とトイレを世界中に", ko: "깨끗한 물과 위생" }, short: { ja: "水・衛生", ko: "물·위생" } },
  { id: 7, color: "#FCC30B", name: { ja: "エネルギーをみんなに そしてクリーンに", ko: "저렴하고 깨끗한 에너지" }, short: { ja: "エネルギー", ko: "에너지" } },
  { id: 8, color: "#A21942", name: { ja: "働きがいも 経済成長も", ko: "양질의 일자리와 경제 성장" }, short: { ja: "働きがい", ko: "일자리" } },
  { id: 9, color: "#FD6925", name: { ja: "産業と技術革新の基盤をつくろう", ko: "산업, 혁신과 사회기반시설" }, short: { ja: "産業革新", ko: "산업혁신" } },
  { id: 10, color: "#DD1367", name: { ja: "人や国の不平等をなくそう", ko: "불평등 감소" }, short: { ja: "不平等", ko: "불평등" } },
  { id: 11, color: "#FD9D24", name: { ja: "住み続けられるまちづくりを", ko: "지속가능한 도시와 공동체" }, short: { ja: "まちづくり", ko: "도시" } },
  { id: 12, color: "#BF8B2E", name: { ja: "つくる責任 つかう責任", ko: "책임감 있는 소비와 생산" }, short: { ja: "消費・生産", ko: "소비·생산" } },
  { id: 13, color: "#3F7E44", name: { ja: "気候変動に具体的な対策を", ko: "기후변화 대응" }, short: { ja: "気候変動", ko: "기후변화" } },
  { id: 14, color: "#0A97D9", name: { ja: "海の豊かさを守ろう", ko: "해양 생태계 보전" }, short: { ja: "海", ko: "해양" } },
  { id: 15, color: "#56C02B", name: { ja: "陸の豊かさも守ろう", ko: "육상 생태계 보호" }, short: { ja: "陸", ko: "육상" } },
  { id: 16, color: "#00689D", name: { ja: "平和と公正をすべての人に", ko: "평화, 정의와 제도" }, short: { ja: "平和・公正", ko: "평화·정의" } },
  { id: 17, color: "#19486A", name: { ja: "パートナーシップで目標を達成しよう", ko: "목표를 위한 파트너십" }, short: { ja: "パートナー", ko: "파트너십" } },
];

export const SDG_IDS: readonly SdgId[] = SDGS.map((sdg) => sdg.id);

export function isSdgId(value: unknown): value is SdgId {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 17;
}

export function getSdg(id: SdgId): Sdg {
  return SDGS[id - 1];
}

/** WCAG 상대 휘도 (0=검정, 1=흰색) */
function luminanceOf(hex: string): number {
  const channel = (start: number) => {
    const v = parseInt(hex.slice(start, start + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * 색 타일 위 글자색. 타일의 번호는 크고 굵은 글자라서 흰 글자와의 대비가 3:1 이상이면 흰색(공식 타일 모양),
 * 그보다 밝은 타일(노랑·주황 계열)에는 어두운 글자를 써요.
 */
export function sdgTextColor(id: SdgId): "#FFFFFF" | "#10161F" {
  const luminance = luminanceOf(getSdg(id).color);
  return 1.05 / (luminance + 0.05) >= 3 ? "#FFFFFF" : "#10161F";
}
