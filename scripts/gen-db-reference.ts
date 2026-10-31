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
import type {
  ActivityKind, AwardKind, CertAnswers, CertCriterionId, ChallengeStatus, OfficialChannel, OfficialShare, Participation, PostKind, PrizeDepositStatus, ProposalStatus, RewardKind, Role, ScoutKind,
  ScoutStatus, SocialPost, Wallet, WalletEntryKind,
} from "../packages/core/src/domain";
import { PRIZE_AWARD, RETURN_RESERVE_MONTHS, returnPoolYen, WITHDRAWAL_MAX_YEN, WITHDRAWAL_MIN_YEN } from "../packages/core/src/wallet";
import {
  containsContact, DEFAULT_OFFICIAL_CHANNEL, isOfficialChannel, nextOfficialDate, OFFICIAL_CHANNELS, OFFICIAL_SHARE_FEE_YEN, POST_LIMITS, validatePostDraft,
} from "../packages/core/src/post";
import type { PostContext, PostDraft } from "../packages/core/src/post";
import { charCount } from "../packages/core/src/proposal";
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

  out.push(...buildFeedGolden());
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
  { name: "post_kind", labels: keysOf<PostKind>({ brag: true, pr: true }), exact: true },
  { name: "official_status", labels: keysOf<OfficialShare["status"]>({ scheduled: true }), exact: false },
  { name: "official_channel", labels: keysOf<OfficialChannel>({ instagram: true, x: true, facebook: true }), exact: true },
  { name: "scout_kind", labels: keysOf<ScoutKind>({ internship: true, offer: true, interview: true }), exact: true },
  { name: "scout_status", labels: keysOf<ScoutStatus>({ sent: true, read: true, accepted: true, declined: true }), exact: false },
  { name: "user_role", labels: keysOf<Role>({ b2c: true, b2b: true }), exact: false },
  { name: "share_template", labels: [...CARD_TEMPLATES], exact: true },
  { name: "locale_code", labels: [...LOCALES], exact: true },
  { name: "esg_category", labels: ["E", "S", "G"], exact: true },
  { name: "cert_unit", labels: [...new Set(CERT_CRITERIA.map((c) => c.unit))].sort(), exact: true },
  // #25 リワード残高: 원장 종류·상금 예치 상태는 정확히 같고, 본인 확인은 DB 에 심사 중(pending)이 더 있어요
  { name: "wallet_entry_kind", labels: keysOf<WalletEntryKind>({ prize: true, return: true, withdrawal: true }), exact: true },
  { name: "prize_deposit_status", labels: keysOf<PrizeDepositStatus>({ deposited: true, paid: true, refunded: true }), exact: true },
  { name: "wallet_kyc_status", labels: keysOf<Wallet["kyc"]>({ none: true, verified: true }), exact: false },
];

function blankAnswers(): CertAnswers {
  const answers = {} as CertAnswers;
  for (const c of CERT_CRITERIA) answers[c.id as CertCriterionId] = { value: 0, evidence: false };
  return answers;
}

// ───────── SNS 피드 (F-503 · F-504, docs/sns-feed.md §5) ─────────
// packages/core/src/post.ts 의 규칙을 표로 만들어요: 한도 상수 · 글자 수 · 연락처 검출 · 공식 SNS 게시 날짜 · 입력 검사.
// db/tests/04_parity.sql 이 같은 입력을 DB 에 넣어 보고 결과가 같은지 대조해요.

/** 보이지 않거나 헷갈리는 글자(공백류·제어 문자·BOM·결합 문자 …)의 코드포인트 범위. SQL 파일에서도 눈에 보이게 U&'\+XXXXXX' 로 적어요 */
const INVISIBLE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x001f], [0x007f, 0x00a0], [0x00ad, 0x00ad], [0x0300, 0x036f], [0x1680, 0x1680], [0x180e, 0x180e], [0x2000, 0x200f],
  [0x2028, 0x202f], [0x205f, 0x2064], [0x2800, 0x2800], [0x3000, 0x3000], [0x3164, 0x3164], [0xfe00, 0xfe0f], [0xfeff, 0xfeff], [0xffa0, 0xffa0],
];
const isInvisible = (code: number) => INVISIBLE_RANGES.some(([from, to]) => code >= from && code <= to);

function sqlLiteral(value: string): string {
  let escaped = false;
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (ch === "'") out += "''";
    else if (ch === "\\") {
      out += "\\\\";
      escaped = true;
    } else if (isInvisible(code)) {
      out += `\\+${code.toString(16).toUpperCase().padStart(6, "0")}`;
      escaped = true;
    } else out += ch;
  }
  return escaped ? `U&'${out}'` : `'${out}'`;
}

/** 글 표의 글자 리터럴. 같은 글자가 20번 넘게 이어지면 repeat() 로 줄여요 (200자·400자 경계 시험용) */
function sqlText(value: string): string {
  const chars = [...value];
  const parts: string[] = [];
  let buffer = "";
  for (let i = 0; i < chars.length; ) {
    let j = i;
    while (j < chars.length && chars[j] === chars[i]) j++;
    if (j - i >= 20) {
      if (buffer !== "") parts.push(sqlLiteral(buffer));
      buffer = "";
      parts.push(`repeat(${sqlLiteral(chars[i])}, ${j - i})`);
    } else buffer += chars.slice(i, j).join("");
    i = j;
  }
  if (buffer !== "" || parts.length === 0) parts.push(sqlLiteral(buffer));
  return parts.length === 1 ? parts[0] : `(${parts.join(" || ")})`;
}

/** 소스 파일에 보이지 않는 글자를 그대로 쓰지 않도록, 코드포인트 번호로 만들어요 */
const fromCodes = (...codes: number[]) => String.fromCodePoint(...codes);
const NBSP = fromCodes(0x00a0);
const IDEOGRAPHIC_SPACE = fromCodes(0x3000); // 전각 공백
const ZWJ = fromCodes(0x200d);
const BOM = fromCodes(0xfeff);
const NEL = fromCodes(0x0085); // JS trim() 이 자르지 않는 줄 끝 문자
const MONGOLIAN_VOWEL_SEPARATOR = fromCodes(0x180e); // 예전엔 공백이었지만 지금의 trim() 은 자르지 않아요
const ZERO_WIDTH_SPACE = fromCodes(0x200b);
const SOFT_HYPHEN = fromCodes(0x00ad);
const HANGUL_FILLER = fromCodes(0x3164);
const BRAILLE_BLANK = fromCodes(0x2800);
const COMBINING_ACUTE = fromCodes(0x0301);
/** 전각 문자로 바꿔요 (ASCII 0x21~0x7e → U+FF01~U+FF5E): 앱도 DB 도 전각 숫자·@ 는 연락처로 보지 않아요 */
const fullwidth = (text: string) => [...text].map((c) => (c.codePointAt(0)! >= 0x21 && c.codePointAt(0)! <= 0x7e ? String.fromCodePoint(c.codePointAt(0)! + 0xfee0) : c)).join("");

/** 입력 검사 대조표의 한 줄: 앱의 draft 는 아래 시나리오에서 만들고, DB 쪽 시험은 같은 시나리오를 실제 INSERT 로 옮겨요 */
interface DraftScenario {
  label: string;
  kind: PostKind;
  body: string;
  title?: string;
  /** 자랑 글: own = 내 참가 실적, none = 실적 없음, other = 다른 학생의 실적, share = 카드뉴스 공유 기록(실적이 아님) */
  activity?: "own" | "none" | "other" | "share";
  /** 홍보 글: 고른 SDGs 태그 수 (0~5) */
  sdgCount?: number;
  /** 홍보 글: none = 연결 없음, own = 우리 회사 챌린지, other = 다른 회사 챌린지 */
  challenge?: "none" | "own" | "other";
}

function buildFeedGolden(): string[] {
  const out: string[] = [];

  // 한도: POST_LIMITS 의 모든 값 + 공식 게시료. core 에 한도가 늘면 여기에도 자동으로 들어와서, DB 쪽 대조가 없으면 04_parity.sql 이 알려 줘요.
  const limits: Array<[string, number]> = [...Object.entries(POST_LIMITS), ["officialFeeYen", OFFICIAL_SHARE_FEE_YEN]];
  out.push(`-- ───── SNS 피드 (F-503 · F-504) ─────`);
  out.push(`CREATE TEMP TABLE golden_post_limits (name text PRIMARY KEY, value integer NOT NULL);`);
  out.push(`INSERT INTO golden_post_limits VALUES\n${rows(limits.map(([name, value]) => `(${q(name)}, ${value})`))}\n`);

  // 글자 수: JS trim() 이 잘라 내는 글자를 BMP 전체에서 찾아요. DB 의 post_char_count 가 글자마다 같은 판정을 하는지 대조해요.
  const trimmed: number[] = [];
  for (let code = 1; code <= 0xffff; code++) {
    if (code >= 0xd800 && code <= 0xdfff) continue;
    if (String.fromCharCode(code).trim() === "") trimmed.push(code);
  }
  out.push(`CREATE TEMP TABLE golden_trim_chars (code_point integer PRIMARY KEY);`);
  out.push(`INSERT INTO golden_trim_chars VALUES\n${rows(trimmed.map((code) => `(${code} /* U+${code.toString(16).toUpperCase().padStart(4, "0")} */)`))}\n`);

  const charCases: Array<[string, string]> = [
    ["빈 글", ""],
    ["공백 하나", " "],
    ["영문 3글자", "abc"],
    ["일본어", "初めての挑戦です"],
    ["한국어", "첫 도전이었어요"],
    ["한자 한 글자", "海"],
    ["이모지 한 개", "🏆"],
    ["이모지 세 개", "🏆🌊🌱"],
    ["ZWJ 로 이은 가족 이모지 (코드포인트 5개)", `👨${ZWJ}👩${ZWJ}👧`],
    ["피부색 이모지 (코드포인트 2개)", "👍🏽"],
    ["결합 문자 (e + ´ = 코드포인트 2개)", `e${COMBINING_ACUTE}`],
    ["가운데 공백은 센다", "あ  い"],
    ["앞뒤 공백은 자른다", "  あ  "],
    ["가운데 줄바꿈·탭은 센다", "あ\n\tい"],
    ["CRLF 는 두 글자", "あ\r\nい"],
    ["NBSP 가 가운데에 있으면 센다", `あ${NBSP}い`],
    ["전각 공백뿐인 글", IDEOGRAPHIC_SPACE + IDEOGRAPHIC_SPACE],
    ["전각 공백으로 감싼 한자", `${IDEOGRAPHIC_SPACE}題${IDEOGRAPHIC_SPACE}`],
    ["BOM 으로 감싼 글", `${BOM}あ${BOM}`],
    ["줄바꿈뿐인 글", "\n\n\n"],
    ["NEL(U+0085)으로 감싼 글 — trim() 이 자르지 않는다", `${NEL}あ${NEL}`],
    ["몽골 모음 구분자(U+180E)로 감싼 글 — 자르지 않는다", `${MONGOLIAN_VOWEL_SEPARATOR}あ${MONGOLIAN_VOWEL_SEPARATOR}`],
    ["폭 없는 공백(U+200B)으로 감싼 글 — 자르지 않는다", `${ZERO_WIDTH_SPACE}あ${ZERO_WIDTH_SPACE}`],
    ["소프트 하이픈(U+00AD)으로 감싼 글 — 자르지 않는다", `${SOFT_HYPHEN}あ${SOFT_HYPHEN}`],
    ["한글 채움 문자(U+3164)로 감싼 글 — 자르지 않는다", `${HANGUL_FILLER}あ${HANGUL_FILLER}`],
    ["점자 빈칸(U+2800)으로 감싼 글 — 자르지 않는다", `${BRAILLE_BLANK}あ${BRAILLE_BLANK}`],
    ["한자 200자", "題".repeat(200)],
    ["일본어 400자", "文".repeat(400)],
  ];
  out.push(`CREATE TEMP TABLE golden_post_chars (case_no integer PRIMARY KEY, label text NOT NULL, content text NOT NULL, chars integer NOT NULL);`);
  out.push(`INSERT INTO golden_post_chars VALUES\n${rows(charCases.map(([label, content], i) => `(${i + 1}, ${q(label)}, ${sqlText(content)}, ${charCount(content)})`))}\n`);

  // 연락처 검출: 이메일 · 전화번호 · 평범한 숫자 (post.test.ts 의 사례 + 경계)
  const contactTexts = [
    "連絡は mina@example.com まで", "mina.sample+sdgs@mail.example.co.jp", "a_b%c@x-y.org", "info@minato.example.jp", "MINA@EXAMPLE.COM", "x@y.jp",
    "a@b.c", "user@localhost", "@handle", "メールは非公開です", fullwidth("abc@example.com"), "mina at example dot com",
    "090-1234-5678", "03-1234-5678", "010-1234-5678", "+81 90 1234 5678", "+82-10-1234-5678", "09012345678", "TEL 0120-123-456",
    "+1 650 253 0000", "+44 20 7946 0958", "123-456-7890", "12345678", "123456789012",
    `${fullwidth("090")}-${fullwidth("1234")}-${fullwidth("5678")}`, "1234 5678", "12-34-56", "100-200", "電話:03(1234)5678",
    "2026年10月30日に受賞", "2026-10-30", "賞金は¥30,000", "SDGs14 と SDGs12", "Lv.3 / 1,476 pt", "17目標すべてに挑戦", "참가자 1234567명", "11/14 13:00",
    "1234567", "1,000,000円", "No.12-345", "",
  ];
  out.push(`CREATE TEMP TABLE golden_post_contacts (case_no integer PRIMARY KEY, content text NOT NULL, has_contact boolean NOT NULL);`);
  out.push(`INSERT INTO golden_post_contacts VALUES\n${rows(contactTexts.map((content, i) => `(${i + 1}, ${sqlText(content)}, ${bool(containsContact(content))})`))}\n`);

  // 공식 SNS 게시 채널: 값 · 말하지 않았을 때의 기본값. DB 의 열거형(official_channel)은 이 값과 정확히 같아야 하고(golden_enums),
  // 기본값(채널 열의 DEFAULT 와 next_official_share_date 의 p_channel)도 같아야 해요. 화면에 보이는 순서는 앱의 일이라 DB 는 몰라요.
  out.push(`CREATE TEMP TABLE golden_official_channels (channel text PRIMARY KEY, is_default boolean NOT NULL);`);
  out.push(`INSERT INTO golden_official_channels VALUES\n${rows(OFFICIAL_CHANNELS.map((channel) => `(${q(channel)}, ${bool(channel === DEFAULT_OFFICIAL_CHANNEL)})`))}\n`);
  // 채널 값 검사: 앱의 isOfficialChannel 이 받아들이는 글자만 DB 의 열거형도 받아들여요 (YouTube · 대소문자 · 공백 · 옛 이름은 모두 거절)
  const channelValues = [
    ...OFFICIAL_CHANNELS, "youtube", "Instagram", "X", "FACEBOOK", " x", "x ", "", "twitter", "linkedin", "instagram-story", "insta", "facebook page",
  ];
  out.push(`CREATE TEMP TABLE golden_official_channel_values (case_no integer PRIMARY KEY, value text NOT NULL, valid boolean NOT NULL);`);
  out.push(`INSERT INTO golden_official_channel_values VALUES\n${rows(channelValues.map((value, i) => `(${i + 1}, ${q(value)}, ${bool(isOfficialChannel(value))})`))}\n`);

  // 공식 SNS 게시 날짜: 채널마다 내일부터 가장 빠른 빈 날짜 (그 채널이 이미 받은 날짜만 건너뛰어요). 홍보 글이 아니거나 신청이 없는 글은 날짜를 잡지 않아요.
  const prPost = (id: string, on: string | null, channel: OfficialChannel = DEFAULT_OFFICIAL_CHANNEL): SocialPost => ({
    id, kind: "pr", companyId: "co-1", title: "題", body: "本文", sdgIds: [14], createdAt: "2026-10-30T09:00", likes: 0, likedBy: [], mine: false, challengeId: null,
    official: on === null ? null : { on, channel, feeYen: OFFICIAL_SHARE_FEE_YEN, status: "scheduled" },
  });
  const bragPost: SocialPost = {
    id: "po-brag", kind: "brag", authorName: "Mina", authorLevel: 1, body: "本文", sdgIds: [14], createdAt: "2026-10-30T09:00", likes: 0, likedBy: [], mine: false,
    achievement: { activityId: null, kind: "participation", title: "題", companyName: "社", award: null, sdgIds: [14] },
  };
  /** 이미 받은 날짜: [날짜] 만 쓰면 기본 채널(instagram), [날짜, 채널] 이면 그 채널의 날짜 */
  type Taken = string | readonly [string, OfficialChannel];
  const takenOn = (t: Taken) => (typeof t === "string" ? t : t[0]);
  const takenChannel = (t: Taken): OfficialChannel => (typeof t === "string" ? DEFAULT_OFFICIAL_CHANNEL : t[1]);
  /** [설명, 기준일, 이미 받은 날짜들, 물어보는 채널 — undefined 면 채널을 말하지 않은 것(기본 instagram)] */
  const dateCases: Array<[string, string, Taken[], OfficialChannel | undefined]> = [
    ["신청이 없으면 내일", "2026-10-30", [], undefined],
    ["내일이 찼으면 모레", "2026-10-30", ["2026-10-31"], undefined],
    ["연달아 찼으면 그다음 날", "2026-10-30", ["2026-10-31", "2026-11-01"], undefined],
    ["내일은 비어 있고 모레만 찼다", "2026-10-30", ["2026-11-01"], undefined],
    ["가운데가 비어 있으면 가장 빠른 빈 날짜", "2026-10-30", ["2026-10-31", "2026-11-02"], undefined],
    ["오늘 이전·오늘 날짜는 상관없다", "2026-10-30", ["2026-10-29", "2026-10-30"], undefined],
    ["먼 미래만 찼다", "2026-10-30", ["2026-11-19"], undefined],
    ["닷새 연속으로 찼다", "2026-10-30", ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"], undefined],
    ["순서가 뒤섞여 있어도 같다", "2026-10-30", ["2026-11-02", "2026-10-31", "2026-11-01"], undefined],
    ["연말: 12/31 → 이듬해 1/1", "2026-12-31", [], undefined],
    ["연말: 1/1 이 찼으면 1/2", "2026-12-31", ["2027-01-01"], undefined],
    ["월말: 11/30 → 12/1", "2026-11-30", [], undefined],
    ["윤년 2/28 → 2/29", "2028-02-28", [], undefined],
    ["윤년 2/29 가 찼으면 3/1", "2028-02-28", ["2028-02-29"], undefined],
    ["평년 2/28 → 3/1", "2027-02-28", [], undefined],
    // 채널별: 같은 채널이 받은 날짜만 건너뛰고, 다른 채널의 날짜는 상관없다
    ["X: 신청이 없으면 내일", "2026-10-30", [], "x"],
    ["Facebook: 신청이 없으면 내일", "2026-10-30", [], "facebook"],
    ["Instagram 을 이름으로 말해도 기본값과 같다", "2026-10-30", ["2026-10-31"], "instagram"],
    ["X: 같은 채널의 내일이 찼으면 모레", "2026-10-30", [["2026-10-31", "x"]], "x"],
    ["X: Instagram·Facebook 의 내일은 상관없다", "2026-10-30", [["2026-10-31", "instagram"], ["2026-10-31", "facebook"]], "x"],
    ["Instagram: X 의 내일은 상관없다 (같은 날 다른 채널)", "2026-10-30", [["2026-10-31", "x"]], "instagram"],
    ["말하지 않으면 Instagram: X·Facebook 이 찬 날은 건너뛰지 않는다", "2026-10-30", [["2026-10-31", "x"], ["2026-11-01", "facebook"]], undefined],
    ["말하지 않으면 Instagram: Instagram 이 찬 날만 건너뛴다", "2026-10-30", [["2026-10-31", "x"], ["2026-10-31", "instagram"], ["2026-11-01", "x"]], undefined],
    ["세 채널이 같은 날을 각각 받았다 — Instagram", "2026-10-30", [["2026-10-31", "x"], ["2026-10-31", "instagram"], ["2026-10-31", "facebook"]], "instagram"],
    ["세 채널이 같은 날을 각각 받았다 — Facebook", "2026-10-30", [["2026-10-31", "x"], ["2026-10-31", "instagram"], ["2026-10-31", "facebook"]], "facebook"],
    ["채널마다 찬 날이 달라 답이 모두 다르다 — X 는 3일 뒤", "2026-10-30", [["2026-10-31", "x"], ["2026-11-01", "x"], ["2026-11-01", "instagram"], ["2026-10-31", "facebook"]], "x"],
    ["채널마다 찬 날이 달라 답이 모두 다르다 — Instagram 은 내일", "2026-10-30", [["2026-10-31", "x"], ["2026-11-01", "x"], ["2026-11-01", "instagram"], ["2026-10-31", "facebook"]], "instagram"],
    ["채널마다 찬 날이 달라 답이 모두 다르다 — Facebook 은 모레", "2026-10-30", [["2026-10-31", "x"], ["2026-11-01", "x"], ["2026-11-01", "instagram"], ["2026-10-31", "facebook"]], "facebook"],
    ["Facebook: 가운데가 비어 있으면 가장 빠른 빈 날짜", "2026-10-30", [["2026-10-31", "facebook"], ["2026-11-02", "facebook"], ["2026-11-01", "x"]], "facebook"],
    ["X: 연말 12/31 → 이듬해 1/1", "2026-12-31", [["2027-01-01", "facebook"]], "x"],
    ["Facebook: 윤년 2/29 가 찼으면 3/1", "2028-02-28", [["2028-02-29", "facebook"], ["2028-02-29", "x"]], "facebook"],
  ];
  out.push(
    `CREATE TEMP TABLE golden_official_dates (case_no integer PRIMARY KEY, label text NOT NULL, today date NOT NULL, channel text, taken date[] NOT NULL, taken_channels text[] NOT NULL, next_on date NOT NULL);`,
  );
  out.push(
    `INSERT INTO golden_official_dates VALUES\n${rows(
      dateCases.map(([label, today, taken, channel], i) => {
        const posts = [...taken.map((t, n) => prPost(`po-${n}`, takenOn(t), takenChannel(t))), prPost("po-none", null), bragPost];
        const dates = taken.length === 0 ? "ARRAY[]::date[]" : `ARRAY[${taken.map((t) => `DATE ${q(takenOn(t))}`).join(", ")}]`;
        const channels = taken.length === 0 ? "ARRAY[]::text[]" : `ARRAY[${taken.map((t) => q(takenChannel(t))).join(", ")}]`;
        const next = channel === undefined ? nextOfficialDate(posts, today) : nextOfficialDate(posts, today, channel);
        return `(${i + 1}, ${q(label)}, DATE ${q(today)}, ${channel === undefined ? "NULL" : q(channel)}, ${dates}, ${channels}, DATE ${q(next)})`;
      }),
    )}\n`,
  );

  // 입력 검사: 앱의 validatePostDraft 가 낸 오류 목록. 오류가 하나도 없으면 DB 도 받아들이고, 있으면 DB 도 거절해야 해요.
  const context: PostContext = { activityIds: ["act-1", "act-2"], challengeIds: ["ch-1"] };
  const ACTIVITY_IDS = { own: "act-1", none: null, other: "act-9", share: "act-share-1" } as const; // other·share 는 context 에 없는 id
  const CHALLENGE_IDS = { none: null, own: "ch-1", other: "ch-9" } as const;
  const SDG_ORDER: SdgId[] = [14, 12, 13, 11, 7];
  const okBrag = "初めての受賞です！";
  const okTitle = "漁港の朝市で容器を減らしました";
  const okBody = "学生のアイデアを実際に試しました。";
  const brag = (label: string, body: string, activity: DraftScenario["activity"] = "own"): DraftScenario => ({ label: `자랑: ${label}`, kind: "brag", body, activity });
  const pr = (label: string, fields: Partial<DraftScenario>): DraftScenario => ({
    label: `홍보: ${label}`, kind: "pr", title: okTitle, body: okBody, sdgCount: 1, challenge: "none", ...fields,
  });
  const bragLimit = POST_LIMITS.bragBody;
  const scenarios: DraftScenario[] = [
    brag("내 실적 + 본문", okBrag),
    brag("실적을 안 붙였다", okBrag, "none"),
    brag("다른 학생의 실적", okBrag, "other"),
    brag("카드뉴스 공유 기록(실적이 아니다)", okBrag, "share"),
    brag("빈 본문", ""),
    brag("공백뿐인 본문", "   "),
    brag("전각 공백·NBSP·탭·줄바꿈뿐인 본문", `${IDEOGRAPHIC_SPACE}${NBSP}\t\n`),
    brag(`본문 ${bragLimit}자`, "あ".repeat(bragLimit)),
    brag(`본문 ${bragLimit + 1}자`, "あ".repeat(bragLimit + 1)),
    brag(`이모지 ${bragLimit}개`, "🏆".repeat(bragLimit)),
    brag(`이모지 ${bragLimit + 1}개`, "🏆".repeat(bragLimit + 1)),
    brag(`앞뒤 공백을 빼면 ${bragLimit}자`, `  ${"あ".repeat(bragLimit)}${IDEOGRAPHIC_SPACE}\n`),
    brag(`가운데 공백까지 세면 ${bragLimit + 1}자`, `${"あ".repeat(bragLimit / 2)} ${"あ".repeat(bragLimit / 2)}`),
    brag("이메일", "連絡は mina@example.com まで"),
    brag("전화번호", "090-1234-5678"),
    brag("8자리 숫자", "12345678"),
    brag("평범한 숫자(날짜·금액·SDGs·Lv.)", "2026年10月30日に受賞、賞金は¥30,000、SDGs14 と Lv.3 / 1,476 pt"),
    brag("실적 없음 + 빈 본문 (오류 둘)", "", "none"),
    pr("제목·본문·태그 1개", {}),
    pr("우리 회사 챌린지 연결 + 태그 3개", { challenge: "own", sdgCount: POST_LIMITS.maxSdgs }),
    pr("다른 회사 챌린지", { challenge: "other" }),
    pr("빈 제목", { title: "" }),
    pr("공백뿐인 제목", { title: `${IDEOGRAPHIC_SPACE} ` }),
    pr("제목 없음(undefined)", { title: undefined }),
    pr(`제목 ${POST_LIMITS.prTitle}자`, { title: "題".repeat(POST_LIMITS.prTitle) }),
    pr(`제목 ${POST_LIMITS.prTitle + 1}자`, { title: "題".repeat(POST_LIMITS.prTitle + 1) }),
    pr(`제목 이모지 ${POST_LIMITS.prTitle}개`, { title: "🌊".repeat(POST_LIMITS.prTitle) }),
    pr(`앞뒤 공백을 빼면 제목 ${POST_LIMITS.prTitle}자`, { title: `${IDEOGRAPHIC_SPACE}${"題".repeat(POST_LIMITS.prTitle)} ` }),
    pr("빈 본문", { body: "" }),
    pr("공백뿐인 본문", { body: " \n\t " }),
    pr(`본문 ${POST_LIMITS.prBody}자`, { body: "文".repeat(POST_LIMITS.prBody) }),
    pr(`본문 ${POST_LIMITS.prBody + 1}자`, { body: "文".repeat(POST_LIMITS.prBody + 1) }),
    pr(`본문 이모지 ${POST_LIMITS.prBody}개`, { body: "🌱".repeat(POST_LIMITS.prBody) }),
    pr("제목에 전화번호", { title: "電話 090-1234-5678 まで" }),
    pr("제목에 이메일", { title: "info@minato.example.jp へ" }),
    pr("본문에 이메일", { body: "お問い合わせは info@minato.example.jp へ" }),
    pr("본문에 국제 전화번호", { body: "+81 90 1234 5678 までお電話ください" }),
    pr("제목·본문의 평범한 숫자", { title: "2026年の取り組み 3つ", body: "参加者 1,234 人、予算 ¥30,000、SDGs14 と SDGs12" }),
    pr("태그 0개", { sdgCount: 0 }),
    pr("태그 3개", { sdgCount: 3 }),
    pr("태그 4개", { sdgCount: 4 }),
    pr("태그 5개", { sdgCount: 5 }),
    pr("모두 틀렸다(빈 제목·빈 본문·태그 0개·다른 회사 챌린지)", { title: "", body: "", sdgCount: 0, challenge: "other" }),
  ];
  const draftOf = (s: DraftScenario): PostDraft =>
    s.kind === "brag"
      ? { kind: "brag", body: s.body, activityId: ACTIVITY_IDS[s.activity ?? "own"] }
      : { kind: "pr", title: s.title, body: s.body, sdgIds: SDG_ORDER.slice(0, s.sdgCount ?? 1), challengeId: CHALLENGE_IDS[s.challenge ?? "none"] };
  out.push(
    `CREATE TEMP TABLE golden_post_cases (case_no integer PRIMARY KEY, label text NOT NULL, kind text NOT NULL, title text, body text NOT NULL, activity text, sdg_count integer, challenge text, errors text NOT NULL);`,
  );
  out.push(
    `INSERT INTO golden_post_cases VALUES\n${rows(
      scenarios.map((s, i) => {
        const errors = validatePostDraft(draftOf(s), context).join(",");
        const title = s.title === undefined ? "NULL" : sqlText(s.title);
        const activity = s.kind === "brag" ? q(s.activity ?? "own") : "NULL";
        const sdgCount = s.kind === "pr" ? String(s.sdgCount ?? 1) : "NULL";
        const challenge = s.kind === "pr" ? q(s.challenge ?? "none") : "NULL";
        return `(${i + 1}, ${q(s.label)}, ${q(s.kind)}, ${title}, ${sqlText(s.body)}, ${activity}, ${sdgCount}, ${challenge}, ${q(errors)})`;
      }),
    )}\n`,
  );
  out.push(...buildWalletGolden());
  return out;
}

/** #25 リワード残高: 출금 1회 상한·하한, 상금을 받는 상, 운전자금 개월 수, 운영 환원 계산 (wallet.ts) */
function buildWalletGolden(): string[] {
  const out: string[] = [];
  out.push(`CREATE TEMP TABLE golden_wallet_constants (name text PRIMARY KEY, value text NOT NULL);`);
  const constants: Array<[string, string]> = [
    ["withdrawal_max_yen", num(WITHDRAWAL_MAX_YEN)],
    ["withdrawal_min_yen", num(WITHDRAWAL_MIN_YEN)],
    ["prize_award", PRIZE_AWARD],
    ["return_reserve_months", num(RETURN_RESERVE_MONTHS)],
  ];
  out.push(`INSERT INTO golden_wallet_constants VALUES\n${rows(constants.map(([name, value]) => `(${q(name)}, ${q(value)})`))}\n`);
  // 환원 총액 = max(0, min(경상이익, 기말 자금 − 운전자금 N개월분)) — 적자 · 자금 부족 · 부분 · 전액 · 개월 수 0/12/24 · 엔 미만 버림 (모두 가상의 숫자)
  const cases: Array<[number, number, number, number]> = [
    [800_000, 6_000_000, 1_200_000, 3],
    [-200_000, 6_000_000, 9_000_000, 3],
    [900_000, 6_000_000, 1_800_000, 3],
    [900_000, 6_000_000, 5_000_000, 3],
    [900_000, 6_000_000, 500_000, 0],
    [10, 7, 100, 3],
    [1_000_000, 11, 10_000_000, 1],
    [2_000_000, 4_000_000, 2_500_000, 3],
    [5_000_000, 12_000_000, 30_000_000, 12],
    [5_000_000, 12_000_000, 30_000_000, 24],
    [0, 0, 0, 3],
    [300_000, 1_200_000, -50_000, 3],
  ];
  out.push(
    `CREATE TEMP TABLE golden_return_pools (case_no integer PRIMARY KEY, ordinary_profit_yen bigint NOT NULL, period_costs_yen bigint NOT NULL, period_end_cash_yen bigint NOT NULL, reserve_months smallint NOT NULL, reserve_yen bigint NOT NULL, pool_yen bigint NOT NULL);`,
  );
  out.push(
    `INSERT INTO golden_return_pools VALUES\n${rows(
      cases.map(([profit, costs, cash, months], i) => {
        const r = returnPoolYen({ ordinaryProfitYen: profit, periodCostsYen: costs, periodEndCashYen: cash, reserveMonths: months });
        return `(${i + 1}, ${profit}, ${costs}, ${cash}, ${months}, ${r.reserveYen}, ${r.poolYen})`;
      }),
    )}\n`,
  );
  return out;
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
