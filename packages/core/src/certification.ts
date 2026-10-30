// SDGs 인증마크(기업용)와 F-403 ESG 점수. 흐름: ① 문항·수치 입력 → ② 증빙 자료 제출 → ③ 절대 평가 기준을 넘으면 자동 부여.
// 증빙 자료를 올리지 않은 항목은 점수에 넣지 않아요. 기준값은 데모용 예시이고, 실서비스에서는 심사 기준표로 바꿔요.
import type { CertAnswers, CertCriterionId } from "./domain";
import type { LocalizedText } from "./i18n";

/** 인증마크에 반드시 함께 보여 줘야 하는 안내 문구 (UN 공식 인증과의 오해 방지) */
export const CERT_DISCLAIMER: LocalizedText = {
  ja: "※当社の認証マークは、UN SDGsの指標を基盤とした独自システムにより運営されており、国連の公式認証を代理・保証するものではありません。",
  ko: "※당사의 인증마크는 UN SDGs 지표를 기반으로 한 독자 시스템으로 운영되며, 유엔의 공식 인증을 대리·보증하는 것이 아닙니다.",
};

export type EsgCategory = "E" | "S" | "G";
export type CertUnit = "percent" | "yen" | "hours" | "flag";

export interface CertCriterion {
  id: CertCriterionId;
  category: EsgCategory;
  unit: CertUnit;
  /** 이 값 이상이면 만점 (그 아래는 비례 득점) */
  target: number;
  /** 배점 (전체 합계 100) */
  weight: number;
  /** 입력할 수 있는 최댓값 */
  max: number;
}

export const CERT_CRITERIA: readonly CertCriterion[] = [
  { id: "ecoPackage", category: "E", unit: "percent", target: 60, weight: 20, max: 100 },
  { id: "renewable", category: "E", unit: "percent", target: 40, weight: 15, max: 100 },
  { id: "donation", category: "S", unit: "yen", target: 300_000, weight: 15, max: 1_000_000_000 },
  { id: "womenManagers", category: "S", unit: "percent", target: 30, weight: 15, max: 100 },
  { id: "volunteer", category: "S", unit: "hours", target: 8, weight: 15, max: 1000 },
  { id: "disclosure", category: "G", unit: "flag", target: 1, weight: 20, max: 1 },
];

/** 인증 레벨 0(미인증)~3 이 되는 최소 점수: ★1 40점, ★2 60점, ★3 80점 */
export const CERT_LEVEL_THRESHOLDS = [40, 60, 80] as const;
export type CertLevel = 0 | 1 | 2 | 3;

export function emptyCertAnswers(): CertAnswers {
  return {
    ecoPackage: { value: 0, evidence: false },
    renewable: { value: 0, evidence: false },
    donation: { value: 0, evidence: false },
    womenManagers: { value: 0, evidence: false },
    volunteer: { value: 0, evidence: false },
    disclosure: { value: 0, evidence: false },
  };
}

export function criterionOf(id: CertCriterionId): CertCriterion {
  return CERT_CRITERIA.find((c) => c.id === id) as CertCriterion;
}

/** 입력값을 정수로 맞추고 0~최댓값 안으로 */
export function clampCertValue(id: CertCriterionId, value: number): number {
  const { max } = criterionOf(id);
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

export interface CertItemResult {
  id: CertCriterionId;
  category: EsgCategory;
  unit: CertUnit;
  value: number;
  evidence: boolean;
  /** 얻은 점수 (소수 첫째 자리까지) */
  points: number;
  max: number;
}

export interface CertResult {
  /** 0~100 */
  total: number;
  level: CertLevel;
  items: CertItemResult[];
  /** 영역별 달성도 0~100 */
  byCategory: Record<EsgCategory, number>;
  /** 값은 넣었지만 증빙이 없어 점수에 들어가지 않은 항목 */
  missingEvidence: CertCriterionId[];
  /** 다음 레벨까지 남은 점수 (최고 레벨이면 null) */
  pointsToNext: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function evaluateCertification(answers: CertAnswers): CertResult {
  const items: CertItemResult[] = CERT_CRITERIA.map((criterion) => {
    const answer = answers[criterion.id];
    const value = clampCertValue(criterion.id, answer.value);
    const ratio = Math.min(1, value / criterion.target);
    const points = answer.evidence ? round1(criterion.weight * ratio) : 0;
    return { id: criterion.id, category: criterion.category, unit: criterion.unit, value, evidence: answer.evidence, points, max: criterion.weight };
  });
  const total = Math.round(items.reduce((sum, item) => sum + item.points, 0));
  const level = (CERT_LEVEL_THRESHOLDS.filter((threshold) => total >= threshold).length) as CertLevel;
  const byCategory = { E: 0, S: 0, G: 0 } as Record<EsgCategory, number>;
  for (const category of ["E", "S", "G"] as const) {
    const group = items.filter((item) => item.category === category);
    const got = group.reduce((sum, item) => sum + item.points, 0);
    const full = group.reduce((sum, item) => sum + item.max, 0);
    byCategory[category] = full === 0 ? 0 : Math.round((got / full) * 100);
  }
  const missingEvidence = items.filter((item) => item.value > 0 && !item.evidence).map((item) => item.id);
  const pointsToNext = level === 3 ? null : CERT_LEVEL_THRESHOLDS[level] - total;
  return { total, level, items, byCategory, missingEvidence, pointsToNext };
}
