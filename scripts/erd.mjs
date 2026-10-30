#!/usr/bin/env node
// README 의 ERD(Mermaid)와 표 목록을 "실제 DB" 에서 읽어 만들어요. 손으로 그린 그림이 아니라서 스키마와 어긋나지 않아요.
//   node scripts/erd.mjs --write    README.md 의 <!-- erd:begin --> … <!-- erd:end --> 사이를 다시 써요
//   node scripts/erd.mjs --check    README 가 DB 와 같은지 확인해요 (CI: 스키마를 바꾸고 README 를 안 고치면 실패)
//   node scripts/erd.mjs --render   docs/erd/*.png 그림 파일도 만들어요 (mermaid-cli(mmdc) 필요 — 로컬 전용)
// DB 접속은 psql 환경 변수(PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE)를 써요. db/schema.sql 이 올라가 있는 DB 여야 해요.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = resolve(root, "README.md");
const BEGIN = "<!-- erd:begin";
const END = "<!-- erd:end -->";
const mode = process.argv.includes("--check") ? "check" : process.argv.includes("--render") ? "render" : process.argv.includes("--write") ? "write" : "print";

// ───────── 그림 묶음 (표는 정확히 한 묶음에 속해야 해요) ─────────
const GROUPS = [
  {
    id: "accounts", no: "①", title: "계정 · 프로필 · 기업", features: "F-101 ~ F-104, F-701",
    summary: "소셜/이메일 로그인, B2C 프로필(관심 SDGs 최대 5개·스킬), 기업 ESG 프로필(관리자 승인·사업자 서류)이에요.",
    tables: ["sdgs", "skills", "users", "oauth_accounts", "student_profiles", "profile_sdg_interests", "profile_skills", "companies", "company_sdgs", "company_members", "company_documents"],
  },
  {
    id: "challenges", no: "②", title: "챌린지 · 팀 빌딩", features: "F-201 ~ F-204",
    summary: "기업이 출제하는 챌린지(마감 7~90일·관리자 승인 후 공개), 목표 SDGs 최대 3개, 심사위원, Q&A, 팀 모집·팀 구성, 북마크예요.",
    tables: ["challenges", "challenge_sdgs", "challenge_skills", "challenge_deliverables", "challenge_rewards", "challenge_attachments", "challenge_judges", "challenge_comments", "team_posts", "team_post_roles", "team_requests", "teams", "team_members", "bookmarks"],
  },
  {
    id: "proposals", no: "③", title: "제출 · 심사 · 수상 · 매칭", features: "F-301 ~ F-303, 수익 모델",
    summary: "기획서 제출(수령증 번호)과 버전, 심사 점수, 수상, 기업의 채용(매칭) → 중개 수수료 ¥30,000 중 50% 기부예요.",
    tables: ["receipt_counters", "proposals", "proposal_versions", "reviews", "awards", "matches", "donation_recipients", "donations"],
  },
  {
    id: "impact", no: "④", title: "Impact Index · 증명서 · SNS", features: "F-104, F-401, F-402, F-501, F-502",
    summary: "활동 기록 → SDG별 점수(레이더 차트)·레벨·배지, 카드뉴스, SHA-256 해시·QR 디지털 증명서와 진위 확인 기록이에요.",
    tables: ["badges", "share_cards", "activities", "activity_sdgs", "impact_scores", "user_badges", "portfolio_files", "certificates", "certificate_verifications"],
  },
  {
    id: "talent", no: "⑤", title: "인재 검색 · 스카우트 · 메시지", features: "F-601 ~ F-603",
    summary: "기업 → 학생 스카우트(하루 3건), 1:1 대화방(연락처 마스킹), 겹치지 않는 면접 일정이에요.",
    tables: ["scouts", "conversations", "messages", "interview_slots"],
  },
  {
    id: "esg", no: "⑥", title: "ESG 리포트 · 인증마크", features: "F-403, 인증마크",
    summary: "ESG 성과 리포트(PDF/Excel)와 SDGs 인증마크(입력 → 증빙 → 기준 충족 시 ★1~3 부여)예요.",
    tables: ["esg_reports", "cert_criteria", "cert_applications", "cert_answers"],
  },
  {
    id: "ops", no: "⑦", title: "알림 · 운영 · 통계 · 번역", features: "F-204, F-701 ~ F-703",
    summary: "마감 알림(D-7/D-3/D-1), 신고·블랙리스트, 변경 불가 감사 로그, 일별 통계, 일본어↔한국어 번역 캐시예요.",
    tables: ["notification_prefs", "device_tokens", "notifications", "reports", "blacklist_entries", "admin_actions", "analytics_daily", "content_translations"],
  },
  {
    id: "social", no: "⑧", title: "SNS 피드 · 공식 SNS 게시", features: "F-503, F-504",
    summary: "학생의 실적 자랑 글(200자)과 기업의 홍보 글(제목 40자·본문 400자)을 한 피드에 모아요. 글마다 SDGs 태그 1~3개, 좋아요(사람마다 한 번·내 글 제외), 공식 SNS(X·Instagram·Facebook) 게시 신청(채널마다 하루에 한 회사)이 붙어요.",
    tables: ["social_posts", "social_post_sdgs", "social_post_likes", "official_share_slots"],
  },
];

// "한눈에 보기" 에 넣을 핵심 표 (열은 생략하고 관계만 그려요)
const OVERVIEW = [
  "users", "student_profiles", "companies", "company_members", "challenges", "challenge_judges", "teams", "team_members", "proposals", "proposal_versions",
  "reviews", "awards", "matches", "donations", "activities", "impact_scores", "certificates", "scouts", "conversations", "messages",
  "cert_applications", "esg_reports", "sdgs", "social_posts",
];

// ───────── DB 읽기 ─────────
const QUERY = `
SELECT json_build_object('tables', (
  SELECT json_agg(t ORDER BY t.name) FROM (
    SELECT c.relname AS name, c.relkind AS kind, obj_description(c.oid, 'pg_class') AS comment,
      (SELECT json_agg(json_build_object('name', a.attname, 'type', format_type(a.atttypid, a.atttypmod), 'notNull', a.attnotnull, 'generated', a.attgenerated <> '') ORDER BY a.attnum)
         FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
      (SELECT json_agg(json_build_object(
                'kind', con.contype, 'name', con.conname,
                'columns', (SELECT json_agg(att.attname ORDER BY k.ord) FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum),
                'refTable', CASE WHEN con.contype = 'f' THEN (SELECT relname FROM pg_class WHERE oid = con.confrelid) END,
                'refColumns', CASE WHEN con.contype = 'f' THEN (SELECT json_agg(att.attname ORDER BY k.ord) FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = k.attnum) END
              ) ORDER BY con.conname)
         FROM pg_constraint con WHERE con.conrelid = c.oid AND con.contype IN ('p', 'u', 'f')) AS constraints
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v')
  ) t))`;

function readCatalog() {
  let out;
  try {
    out = execFileSync("psql", ["-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1", "-c", QUERY], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    console.error("✗ psql 로 DB 를 읽지 못했어요. PGHOST/PGPORT/PGUSER/PGDATABASE 를 확인하고 db/schema.sql 이 올라가 있어야 해요.");
    console.error(String(error.stderr ?? error.message));
    process.exit(2);
  }
  const { tables } = JSON.parse(out);
  const byName = new Map(tables.map((t) => [t.name, { ...t, columns: t.columns ?? [], constraints: t.constraints ?? [] }]));
  return byName;
}

// ───────── Mermaid 만들기 ─────────
const TYPE_NAMES = new Map([
  ["timestamp with time zone", "timestamptz"], ["timestamp without time zone", "timestamp"], ["integer", "int"], ["character varying", "varchar"],
  ["double precision", "float8"], ["boolean", "boolean"],
]);
function mermaidType(pgType) {
  let t = pgType.replace(/\(\d+(,\d+)?\)$/, "");
  const isArray = t.endsWith("[]");
  if (isArray) t = t.slice(0, -2);
  t = TYPE_NAMES.get(t) ?? t.replace(/^character$/, "char");
  t = t.replace(/[^A-Za-z0-9_]/g, "_");
  return isArray ? `${t}_array` : t;
}

function keyInfo(table) {
  const pk = new Set();
  const fk = new Set();
  const uk = new Set();
  for (const con of table.constraints) {
    if (con.kind === "p") con.columns.forEach((c) => pk.add(c));
    if (con.kind === "f") con.columns.forEach((c) => fk.add(c));
    if (con.kind === "u" && con.columns.length === 1) uk.add(con.columns[0]);
  }
  return { pk, fk, uk };
}

function entityBlock(table, { stub = false } = {}) {
  const { pk, fk, uk } = keyInfo(table);
  const lines = [`  ${table.name} {`];
  for (const col of table.columns) {
    if (stub && !pk.has(col.name)) continue;
    const keys = [];
    if (pk.has(col.name)) keys.push("PK");
    if (fk.has(col.name)) keys.push("FK");
    if (uk.has(col.name) && !pk.has(col.name)) keys.push("UK");
    const comment = col.generated ? ' "자동 계산"' : "";
    lines.push(`    ${mermaidType(col.type)} ${col.name}${keys.length ? " " + keys.join(", ") : ""}${comment}`);
  }
  lines.push("  }");
  return lines.join("\n");
}

function relationshipLine(child, con) {
  const colSet = new Set(con.columns);
  const notNull = con.columns.every((name) => child.columns.find((c) => c.name === name)?.notNull);
  const sameSet = (cols) => cols.length === colSet.size && cols.every((c) => colSet.has(c));
  const oneToOne = child.constraints.some((k) => (k.kind === "p" || k.kind === "u") && sameSet(k.columns));
  const pkCols = child.constraints.find((k) => k.kind === "p")?.columns ?? [];
  const identifying = con.columns.every((c) => pkCols.includes(c));
  const left = notNull ? "||" : "|o";
  const right = oneToOne ? "o|" : "o{";
  return `  ${con.refTable} ${left}${identifying ? "--" : ".."}${right} ${child.name} : "${con.columns.join(", ")}"`;
}

function groupDiagram(group, catalog) {
  const inGroup = new Set(group.tables);
  const stubs = new Set();
  const relations = [];
  for (const name of group.tables) {
    const table = catalog.get(name);
    for (const con of table.constraints.filter((k) => k.kind === "f")) {
      if (!inGroup.has(con.refTable)) stubs.add(con.refTable);
      relations.push(relationshipLine(table, con));
    }
  }
  const blocks = [
    ...group.tables.map((name) => entityBlock(catalog.get(name))),
    ...[...stubs].sort().map((name) => entityBlock(catalog.get(name), { stub: true })),
  ];
  return ["erDiagram", ...blocks, ...relations].join("\n");
}

function overviewDiagram(catalog) {
  const set = new Set(OVERVIEW);
  const relations = [];
  for (const name of OVERVIEW) {
    const table = catalog.get(name);
    for (const con of table.constraints.filter((k) => k.kind === "f" && set.has(k.refTable))) {
      // 사람이 읽는 그림이라 created_by/approved_by 같은 보조 관계는 빼요
      if (con.columns.some((c) => /^(created_by|approved_by|awarded_by|adopted_by|sender_id|proposed_by|decided_by|handled_by|reviewed_by|generated_by)$/.test(c))) continue;
      relations.push(relationshipLine(table, con).replace(/ : ".*"$/, ` : "${con.columns[0].replace(/_id$/, "")}"`));
    }
  }
  return ["erDiagram", ...relations].join("\n");
}

// ───────── README 조각 ─────────
const fence = (body) => "```mermaid\n" + body + "\n```";
const splitComment = (comment) => {
  const i = comment.lastIndexOf(" — ");
  return i < 0 ? [comment, ""] : [comment.slice(0, i), comment.slice(i + 3)];
};
const esc = (text) => text.replaceAll("|", "\\|");

function buildBlock(catalog) {
  const assigned = new Map();
  for (const group of GROUPS) for (const t of group.tables) {
    if (!catalog.has(t)) throw new Error(`그림 묶음 "${group.id}" 의 표 ${t} 가 DB 에 없어요 — scripts/erd.mjs 의 GROUPS 를 고쳐 주세요`);
    if (assigned.has(t)) throw new Error(`표 ${t} 가 두 묶음(${assigned.get(t)}, ${group.id})에 있어요`);
    assigned.set(t, group.id);
  }
  const baseTables = [...catalog.values()].filter((t) => t.kind === "r").map((t) => t.name);
  const missing = baseTables.filter((t) => !assigned.has(t));
  if (missing.length) throw new Error(`ERD 묶음에 없는 표가 있어요: ${missing.join(", ")} — scripts/erd.mjs 의 GROUPS 에 추가해 주세요`);
  const views = [...catalog.values()].filter((t) => t.kind === "v");

  const out = [];
  out.push(`${BEGIN} — 자동 생성: node scripts/erd.mjs --write (db/schema.sql 에서 읽어요. 직접 고치지 마세요) -->`);
  out.push(`표 ${baseTables.length}개 · 뷰 ${views.length}개 · 외래 키 ${[...catalog.values()].reduce((n, t) => n + t.constraints.filter((k) => k.kind === "f").length, 0)}개. 아래 그림과 표 설명은 \`db/schema.sql\` 을 실제 PostgreSQL 에 올려서 읽어 만든 거라, 스키마가 바뀌면 CI 가 README 를 다시 만들라고 알려 줘요.`);
  out.push("");
  out.push("#### 한눈에 보기 (핵심 표만, 열 생략)");
  out.push("");
  out.push(fence(overviewDiagram(catalog)));
  out.push("");
  out.push("> 범례: `||` 정확히 하나 · `o|` 없거나 하나 · `o{` 없거나 여러 개 · 실선(`--`)은 부모 없이 존재할 수 없는 종속 관계(기본 키에 포함된 FK), 점선(`..`)은 일반 참조예요.");
  for (const group of GROUPS) {
    out.push("");
    out.push(`#### ${group.no} ${group.title} — ${group.features}`);
    out.push("");
    out.push(group.summary);
    out.push("");
    out.push(fence(groupDiagram(group, catalog)));
    out.push("");
    out.push("| 표 | 설명 | 기능 |");
    out.push("| --- | --- | --- |");
    for (const name of group.tables) {
      const [desc, feature] = splitComment(catalog.get(name).comment ?? "");
      out.push(`| \`${name}\` | ${esc(desc)} | ${esc(feature)} |`);
    }
  }
  out.push("");
  out.push("#### 뷰 (집계·화면용)");
  out.push("");
  out.push("| 뷰 | 설명 | 기능 |");
  out.push("| --- | --- | --- |");
  for (const v of views) {
    const [desc, feature] = splitComment(v.comment ?? "");
    out.push(`| \`${v.name}\` | ${esc(desc)} | ${esc(feature)} |`);
  }
  out.push(END);
  return out.join("\n");
}

function currentBlock(readme) {
  const start = readme.indexOf(BEGIN);
  const end = readme.indexOf(END);
  if (start < 0 || end < 0 || end < start) return null;
  return { start, end: end + END.length };
}

// ───────── 실행 ─────────
const catalog = readCatalog();
const block = buildBlock(catalog);

if (mode === "print") {
  console.log(block);
} else if (mode === "render") {
  const dir = resolve(root, "docs/erd");
  mkdirSync(dir, { recursive: true });
  const jobs = [{ id: "00-overview", text: overviewDiagram(catalog) }, ...GROUPS.map((g, i) => ({ id: `${String(i + 1).padStart(2, "0")}-${g.id}`, text: groupDiagram(g, catalog) }))];
  for (const job of jobs) {
    const src = resolve(dir, `${job.id}.mmd`);
    writeFileSync(src, job.text + "\n");
    execFileSync("mmdc", ["-i", src, "-o", resolve(dir, `${job.id}.png`), "-b", "white", "-s", "2", "-q"], { stdio: "inherit" });
    console.log(`✓ docs/erd/${job.id}.png`);
  }
} else {
  if (!existsSync(readmePath)) {
    console.error("✗ README.md 가 없어요");
    process.exit(1);
  }
  const readme = readFileSync(readmePath, "utf8");
  const range = currentBlock(readme);
  if (!range) {
    console.error(`✗ README.md 에 ${BEGIN} … ${END} 표시가 없어요`);
    process.exit(1);
  }
  const next = readme.slice(0, range.start) + block + readme.slice(range.end);
  if (mode === "write") {
    writeFileSync(readmePath, next);
    console.log(`✓ README.md 의 ERD·표 목록을 DB 에서 다시 만들었어요 (${block.split("\n").length}줄)`);
  } else if (next !== readme) {
    console.error("✗ README.md 의 ERD·표 목록이 db/schema.sql 과 달라요 — `node scripts/erd.mjs --write` 를 실행해서 README 를 갱신해 주세요.");
    const a = readme.slice(range.start, range.end).split("\n");
    const b = block.split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { console.error(`  첫 차이(${i + 1}번째 줄)\n   README: ${a[i] ?? "(없음)"}\n   DB    : ${b[i] ?? "(없음)"}`); break; }
    process.exit(1);
  } else {
    console.log("✓ README.md 의 ERD·표 목록이 db/schema.sql 과 일치해요");
  }
}
