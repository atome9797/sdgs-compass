// SDGs 실천 마크(화면 표기: ja 取組みマーク — 코드·DB 이름은 cert*)와 F-403 ESG 점수. 흐름: ① 문항·수치 입력 → ② 증빙 자료 제출 → ③ 달성도(100점 만점) 10점마다 별 반 개(★0.5~★5.0, #35).
// 증빙 자료를 올리지 않은 항목은 점수에 넣지 않아요. 기준값은 데모용 예시이고, 실서비스에서는 심사 기준표로 바꿔요.
// 마크는 기업 화면(ESG)과 학생이 보는 회사 이름 옆(피드·챌린지 카드·챌린지 상세)에 보여요 — 별은 늘 마크 이름·숫자와 함께(사용자 평점으로 읽히지 않게).
import type { CertAnswers, CertCriterionId } from "./domain";
import type { LocalizedText } from "./i18n";

/** 실천 마크에 반드시 함께 보여 줘야 하는 안내 문구 (국가·자치체·UN 의 공적 인증과의 오해 방지 — #19) */
export const CERT_DISCLAIMER: LocalizedText = {
  ja: "※この取組みマークは独自の目安です。国・自治体・国連の認証ではありません。",
  ko: "※이 실천 마크는 자체 기준이에요. 국가·지자체·유엔의 인증이 아니에요.",
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

/**
 * 실천 마크의 별(#35): 달성도(0~100) 10점마다 별이 반 개씩 늘어요 — 10점 ★0.5 … 100점 ★5.0, 10점 미만은 未取得(별 0).
 * 규칙을 바꿀 때는 이 세 값만 고쳐요. DB 의 cert_star_step() · cert_points_per_star_step() · cert_max_stars() 도 같은 값이어야 하고,
 * db/tests/04_parity.sql 이 상수와 점수마다의 별 수를 대조해요(scripts/gen-db-reference.ts 가 정답표를 만들어요).
 */
export const CERT_STAR_STEP = 0.5;
/** 별이 한 단계(반 개) 늘어나는 데 필요한 달성도 점수 */
export const CERT_POINTS_PER_STAR_STEP = 10;
/** 만점 별 수 (★5.0) */
export const CERT_MAX_STARS = 5;

/** 달성도(0~100) → 별 수: floor(점수 ÷ 10) × 0.5, 최대 5. 0 이면 未取得 (숫자가 아니거나 0 이하도 0) */
export function certStarsOf(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  const steps = Math.min(Math.round(CERT_MAX_STARS / CERT_STAR_STEP), Math.floor(score / CERT_POINTS_PER_STAR_STEP));
  return steps * CERT_STAR_STEP;
}

/** 다음 별(지금보다 한 단계 위)과 거기까지 남은 점수. 이미 만점(★5.0)이면 null */
export function certNextStar(score: number): { stars: number; points: number } | null {
  const stars = certStarsOf(score);
  if (stars >= CERT_MAX_STARS) return null;
  const nextSteps = Math.round(stars / CERT_STAR_STEP) + 1;
  const base = Number.isFinite(score) ? Math.max(0, score) : 0;
  return { stars: nextSteps * CERT_STAR_STEP, points: Math.ceil(nextSteps * CERT_POINTS_PER_STAR_STEP - base) };
}

/** 별 그림 한 칸: 가득 · 반 · 빈 */
export type StarIcon = "full" | "half" | "empty";

/** 별 수 → 별 그림 5칸 (예: 2.5 → 가득 가득 반 빈 빈). 그림만으로 뜻을 전하지 않게 화면은 숫자를 늘 함께 보여 줘요 */
export function certStarIcons(stars: number): StarIcon[] {
  const value = Number.isFinite(stars) ? stars : 0;
  return Array.from({ length: CERT_MAX_STARS }, (_, i): StarIcon => (value - i >= 1 ? "full" : value - i >= 0.5 ? "half" : "empty"));
}

/** 별 수를 글자로: 늘 소수 첫째 자리까지 ("2.5" · "3.0" · "5.0") — ★3 과 ★3.0 이 섞이지 않게 */
export function formatStars(stars: number): string {
  const decimals = Math.max(1, (String(CERT_STAR_STEP).split(".")[1] ?? "").length);
  return (Number.isFinite(stars) ? stars : 0).toFixed(decimals);
}

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
  /** 실천 마크의 별 수: 0(未取得) · 0.5 ~ 5.0 (certStarsOf) */
  stars: number;
  items: CertItemResult[];
  /** 영역별 달성도 0~100 */
  byCategory: Record<EsgCategory, number>;
  /** 값은 넣었지만 증빙이 없어 점수에 들어가지 않은 항목 */
  missingEvidence: CertCriterionId[];
  /** 다음 별(반 개 위)까지 남은 점수 (★5.0 이면 null) */
  pointsToNext: number | null;
  /** 다음 별 수 (★5.0 이면 null) */
  nextStars: number | null;
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
  const byCategory = { E: 0, S: 0, G: 0 } as Record<EsgCategory, number>;
  for (const category of ["E", "S", "G"] as const) {
    const group = items.filter((item) => item.category === category);
    const got = group.reduce((sum, item) => sum + item.points, 0);
    const full = group.reduce((sum, item) => sum + item.max, 0);
    byCategory[category] = full === 0 ? 0 : Math.round((got / full) * 100);
  }
  const missingEvidence = items.filter((item) => item.value > 0 && !item.evidence).map((item) => item.id);
  const next = certNextStar(total);
  return { total, stars: certStarsOf(total), items, byCategory, missingEvidence, pointsToNext: next?.points ?? null, nextStars: next?.stars ?? null };
}
