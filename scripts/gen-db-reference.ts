// db/seed.sql(참조 데이터)과 db/tests/golden.sql(앱 ↔ DB 대조용 정답표)을 packages/core 에서 만들어요.
//   npm run db:generate          → 파일을 다시 써요
//   npm run db:generate -- --check → 파일이 최신인지만 확인해요 (CI 에서 사용: 앱 규칙을 바꾸고 이 파일을 안 고치면 실패)
// 앱(packages/core)이 규칙의 기준이고, DB 는 같은 규칙을 SQL 로 한 번 더 지켜요. 둘이 어긋나면 db/tests/04_parity.sql 이 잡아내요.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SDGS } from "../packages/core/src/sdg";
import { SKILL_IDS } from "../packages/core/src/domain";
import { translate } from "../packages/core/src/messages";
import { BADGE_CODES, BADGE_EMOJI, levelOf, SDG_SATURATION } from "../packages/core/src/impact";
import { CERT_CRITERIA, evaluateCertification } from "../packages/core/src/certification";
import { splitMatchFee } from "../packages/core/src/fees";
import { issueCertificate, qrPayload, verifyCode } from "../packages/core/src/certificate";
import type { ActivityKind, AwardKind, CertAnswers, CertCriterionId, ChallengeStatus, Participation, ProposalStatus, RewardKind, Role, ScoutKind, ScoutStatus } from "../packages/core/src/domain";
import { LOCALES } from "../packages/core/src/i18n";
import { CARD_TEMPLATES } from "../packages/core/src/shareCard";
import type { Certificate } from "../packages/core/src/certificate";
import type { SdgId } from "../packages/core/src/sdg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const q = (value: string) => `'${value.replaceAll("'", "''")}'`;
const num = (value: number) => String(value);
const bool = (value: boolean) => (value ? "true" : "false");
const arr = (values: readonly number[]) => `ARRAY[${values.join(", ")}]::smallint[]`;

function rows(lines: string[]): string {
  return lines.map((line, i) => `  ${line}${i === lines.length - 1 ? ";" : ","}`).join("\n");
}

// ───────── db/seed.sql ─────────
function buildSeed(): string {
  const parts: string[] = [];
  parts.push(`-- 자동 생성 파일 — 직접 고치지 마세요. (scripts/gen-db-reference.ts ← packages/core)
-- 앱과 DB 가 같은 상수를 쓰도록 packages/core 의 값에서 그대로 만든 참조 데이터예요.
-- 적용: psql -v ON_ERROR_STOP=1 -f db/schema.sql -f db/seed.sql
`);
  parts.push(`INSERT INTO sdgs (id, color, name_ja, name_ko, short_ja, short_ko) VALUES\n${rows(
    SDGS.map((s) => `(${s.id}, ${q(s.color)}, ${q(s.name.ja)}, ${q(s.name.ko)}, ${q(s.short.ja)}, ${q(s.short.ko)})`),
  )}\n`);
  parts.push(`INSERT INTO skills (code, name_ja, name_ko) VALUES\n${rows(
    SKILL_IDS.map((id) => `(${q(id)}, ${q(translate(`skill.${id}`, "ja"))}, ${q(translate(`skill.${id}`, "ko"))})`),
  )}\n`);
  parts.push(`INSERT INTO badges (code, emoji, name_ja, name_ko, desc_ja, desc_ko) VALUES\n${rows(
    BADGE_CODES.map(
      (code) =>
        `(${q(code)}, ${q(BADGE_EMOJI[code])}, ${q(translate(`badge.${code}.name`, "ja"))}, ${q(translate(`badge.${code}.name`, "ko"))}, ${q(
          translate(`badge.${code}.desc`, "ja"),
        )}, ${q(translate(`badge.${code}.desc`, "ko"))})`,
    ),
  )}\n`);
  parts.push(`INSERT INTO cert_criteria (code, category, unit, target, weight, max_value) VALUES\n${rows(
    CERT_CRITERIA.map((c) => `(${q(c.id)}, ${q(c.category)}, ${q(c.unit)}, ${num(c.target)}, ${num(c.weight)}, ${num(c.max)})`),
  )}\n`);
  return parts.join("\n");
}

// ───────── db/tests/golden.sql ─────────
/** 항상 같은 값을 내는 난수 (mulberry32) — 정답표가 실행할 때마다 바뀌지 않게 */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGolden(): string {
  const out: string[] = [];
  out.push(`-- 자동 생성 파일 — 직접 고치지 마세요. (scripts/gen-db-reference.ts ← packages/core)
-- packages/core 가 계산한 "정답"을 임시 표로 만들어요. db/tests/04_parity.sql 이 DB 의 함수·생성 열과 대조해요.
`);

  // SDG 점수: 100 × (1 − e^(−포인트/300)) 의 반올림 (impact.ts computeImpactIndex)
  const raws: number[] = [];
  for (let r = 0; r <= 1200; r++) raws.push(r);
  for (let r = 1250; r <= 6000; r += 50) raws.push(r);
  out.push(`CREATE TEMP TABLE golden_sdg_scores (raw_points integer PRIMARY KEY, score integer NOT NULL);`);
  out.push(`INSERT INTO golden_sdg_scores VALUES\n${rows(raws.map((r) => `(${r}, ${Math.round(100 * (1 - Math.exp(-r / SDG_SATURATION)))})`))}\n`);

  // 레벨 경계값
  const levelPoints = [0, 1, 299, 300, 301, 699, 700, 701, 1499, 1500, 1501, 2499, 2500, 2501, 9999];
  out.push(`CREATE TEMP TABLE golden_levels (points integer PRIMARY KEY, level integer NOT NULL);`);
  out.push(`INSERT INTO golden_levels VALUES\n${rows(levelPoints.map((p) => `(${p}, ${levelOf(p)})`))}\n`);

  // 수수료 분할 (기부 = 내림, 나머지 = 운영 수익)
  const fees = [1, 2, 3, 99, 100, 1001, 29_999, 30_000, 30_001, 45_000, 100_000, 999_999];
  out.push(`CREATE TEMP TABLE golden_fees (fee_yen integer PRIMARY KEY, donation_yen integer NOT NULL, revenue_yen integer NOT NULL);`);
  out.push(
    `INSERT INTO golden_fees VALUES\n${rows(
      fees.map((fee) => {
        const s = splitMatchFee(fee);
        return `(${fee}, ${s.donationYen}, ${s.revenueYen})`;
      }),
    )}\n`,
  );

  // 인증마크: 항목별 점수 (값 × 증빙 유무)
  const itemRows: string[] = [];
  const valueGrid = (target: number, max: number): number[] => {
    const set = new Set<number>([0, 1, 2, 3, 5, 7, 8, 9, target - 1, target, target + 1, max]);
    for (let v = 0; v <= Math.min(max, 120); v++) set.add(v);
    for (const f of [0.05, 0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 0.9, 1.1, 2]) set.add(Math.min(max, Math.round(target * f)));
    return [...set].filter((v) => v >= 0 && v <= max).sort((a, b) => a - b);
  };
  for (const c of CERT_CRITERIA) {
    for (const value of valueGrid(c.target, c.max)) {
      for (const evidence of [true, false]) {
        const answers = blankAnswers();
        answers[c.id] = { value, evidence };
        const item = evaluateCertification(answers).items.find((i) => i.id === c.id)!;
        itemRows.push(`(${q(c.id)}, ${value}, ${bool(evidence)}, ${item.points.toFixed(1)})`);
      }
    }
  }
  out.push(`CREATE TEMP TABLE golden_cert_items (code text, value bigint, evidence boolean, points numeric(4,1), PRIMARY KEY (code, value, evidence));`);
  out.push(`INSERT INTO golden_cert_items VALUES\n${rows(itemRows)}\n`);

  // 인증마크: 여섯 항목을 한꺼번에 낸 신청서 → 합계 점수와 레벨
  const rand = prng(20261114);
  const pickOf = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
  const caseRows: string[] = [];
  const totalRows: string[] = [];
  for (let n = 1; n <= 300; n++) {
    const answers = blankAnswers();
    for (const c of CERT_CRITERIA) {
      const candidates = [0, 1, Math.round(c.target * 0.25), Math.round(c.target * 0.5), Math.round(c.target * 0.75), c.target - 1, c.target, c.target + 3, c.max];
      const value = Math.min(c.max, Math.max(0, pickOf(candidates)));
      const evidence = c.unit === "flag" ? value > 0 && rand() < 0.8 : rand() < 0.8;
      answers[c.id] = { value, evidence };
      caseRows.push(`(${n}, ${q(c.id)}, ${value}, ${bool(evidence)})`);
    }
    const result = evaluateCertification(answers);
    totalRows.push(`(${n}, ${result.total}, ${result.level})`);
  }
  out.push(`CREATE TEMP TABLE golden_cert_cases (case_no integer, code text, value bigint, evidence boolean, PRIMARY KEY (case_no, code));`);
  out.push(`INSERT INTO golden_cert_cases VALUES\n${rows(caseRows)}\n`);
  out.push(`CREATE TEMP TABLE golden_cert_totals (case_no integer PRIMARY KEY, total integer NOT NULL, level integer NOT NULL);`);
  out.push(`INSERT INTO golden_cert_totals VALUES\n${rows(totalRows)}\n`);

  // 열거형: core 의 유니온 타입 값이 DB 열거형에 모두 있는지 (exact 면 DB 에 여분이 없는지도)
  //   Record<유니온, true> 로 적어서, core 에 값이 늘면 이 목록도 고치도록 타입 검사가 알려 줘요.
  out.push(`CREATE TEMP TABLE golden_enums (enum_name text, label text, exact boolean, PRIMARY KEY (enum_name, label));`);
  const enumRows: string[] = [];
  for (const e of ENUMS) for (const label of e.labels) enumRows.push(`(${q(e.name)}, ${q(label)}, ${bool(e.exact)})`);
  out.push(`INSERT INTO golden_enums VALUES\n${rows(enumRows)}\n`);

  // 디지털 증명서: 앱이 만든 해시를 DB 가 같은 글자열로 다시 계산해서 맞춰 봐요
  const vectors: Omit<Certificate, "hash">[] = [
    { id: "SC-C-0001", kind: "award", holder: "Mina", challengeTitle: "海洋プラスチックを減らす新しい包装アイデア", companyName: "みなと海洋フーズ", award: "excellence", sdgIds: [14, 12], points: 300, issuedOn: "2026-10-01" },
    { id: "SC-C-0002", kind: "participation", holder: "홍길동", challengeTitle: "商店街の空き店舗活用プラン", companyName: "まちづくりラボ", award: null, sdgIds: [11], points: 50, issuedOn: "2026-10-30" },
    { id: "SC-C-0003", kind: "award", holder: 'Rin "Sato"', challengeTitle: "引用符 \" と 円記号 \\ と アポストロフィ ' を含む題名", companyName: "A&B <株>", award: "grand", sdgIds: [7, 13, 17], points: 400, issuedOn: "2027-01-05" },
    { id: "SC-C-0004", kind: "participation", holder: "名前 🌊", challengeTitle: "絵文字🌱と改行\nタブ\tを含む", companyName: "ことば教育サポート", award: null, sdgIds: [4, 10], points: 50, issuedOn: "2026-12-31" },
    { id: "SC-C-12345", kind: "award", holder: "Test", challengeTitle: "Long serial number", companyName: "Co.", award: "special", sdgIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], points: 200, issuedOn: "2026-02-28" },
  ];
  const certRows: string[] = [];
  for (const v of vectors) {
    const c = issueCertificate(v);
    certRows.push(
      `(${q(c.id)}, ${q(c.kind)}, ${q(c.holder)}, ${q(v.challengeTitle as string)}, ${q(v.companyName as string)}, ${c.award ? q(c.award) : "NULL"}, ${arr(c.sdgIds)}, ${c.points}, DATE ${q(c.issuedOn)}, ${q(c.hash)}, ${q(verifyCode(c.hash))}, ${q(qrPayload(c))})`,
    );
  }
  out.push(`CREATE TEMP TABLE golden_certificates (serial_no text PRIMARY KEY, kind text, holder_name text, challenge_title text, company_name text, award_kind text, sdg_ids smallint[], points integer, issued_on date, content_hash text, verify_code text, qr_payload text);`);
  out.push(`INSERT INTO golden_certificates VALUES\n${rows(certRows)}\n`);
  return out.join("\n");
}

const keysOf = <T extends string>(record: Record<T, true>): T[] => Object.keys(record) as T[];

const ENUMS: Array<{ name: string; labels: string[]; exact: boolean }> = [
  { name: "challenge_status", labels: keysOf<ChallengeStatus>({ open: true, judging: true, closed: true }), exact: false },
  { name: "participation_kind", labels: keysOf<Participation>({ individual: true, team: true, both: true }), exact: true },
  { name: "reward_kind", labels: keysOf<RewardKind>({ prize: true, internship: true, offer: true }), exact: true },
  { name: "proposal_status", labels: keysOf<ProposalStatus>({ submitted: true, reviewed: true, awarded: true, adopted: true }), exact: false },
  { name: "award_kind", labels: keysOf<AwardKind>({ grand: true, excellence: true, special: true }), exact: true },
  { name: "activity_kind", labels: keysOf<ActivityKind>({ participation: true, submission: true, award: true, share: true }), exact: true },
  { name: "scout_kind", labels: keysOf<ScoutKind>({ internship: true, offer: true, interview: true }), exact: true },
  { name: "scout_status", labels: keysOf<ScoutStatus>({ sent: true, read: true, accepted: true, declined: true }), exact: false },
  { name: "user_role", labels: keysOf<Role>({ b2c: true, b2b: true }), exact: false },
  { name: "share_template", labels: [...CARD_TEMPLATES], exact: true },
  { name: "locale_code", labels: [...LOCALES], exact: true },
  { name: "esg_category", labels: ["E", "S", "G"], exact: true },
  { name: "cert_unit", labels: [...new Set(CERT_CRITERIA.map((c) => c.unit))].sort(), exact: true },
];

function blankAnswers(): CertAnswers {
  const answers = {} as CertAnswers;
  for (const c of CERT_CRITERIA) answers[c.id as CertCriterionId] = { value: 0, evidence: false };
  return answers;
}

// ───────── 쓰기 / 확인 ─────────
const targets: Array<{ path: string; content: string }> = [
  { path: resolve(root, "db/seed.sql"), content: buildSeed() },
  { path: resolve(root, "db/tests/golden.sql"), content: buildGolden() },
];

let stale = false;
for (const { path, content } of targets) {
  if (check) {
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (current !== content) {
      stale = true;
      console.error(`✗ ${path.replace(root + "/", "")} 가 packages/core 와 맞지 않아요 — npm run db:generate 를 실행해 주세요.`);
    }
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    console.log(`✓ ${path.replace(root + "/", "")} (${content.length.toLocaleString()} bytes)`);
  }
}
if (check) {
  if (stale) process.exit(1);
  console.log("✓ db/seed.sql · db/tests/golden.sql 이 packages/core 와 일치해요");
}

export type { SdgId };
