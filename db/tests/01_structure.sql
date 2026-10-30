-- 구조 점검: 설계 약속이 지켜지는지 DB 카탈로그를 직접 읽어서 확인해요.
\ir helpers.sql

-- 참조 데이터 (db/seed.sql)
SELECT pg_temp.eq((SELECT count(*) FROM sdgs)::int, 17, 'SDGs 는 17개 목표다');
SELECT pg_temp.eq((SELECT count(*) FROM skills)::int, 10, '스킬 태그 10개');
SELECT pg_temp.eq((SELECT count(*) FROM badges)::int, 6, '배지 6개');
SELECT pg_temp.eq((SELECT sum(weight) FROM cert_criteria)::int, 100, '인증마크 배점의 합은 100점이다');
SELECT pg_temp.eq((SELECT string_agg(category::text, '' ORDER BY category) FROM (SELECT DISTINCT category FROM cert_criteria) c), 'ESG', '인증마크 항목은 E·S·G 세 영역을 모두 다룬다');

-- 모든 표에는 기본 키가 있다
SELECT pg_temp.none($q$SELECT c.relname AS table_without_pk
                         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public' AND c.relkind = 'r'
                          AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p')$q$,
                    '모든 표에는 기본 키(PK)가 있다');

-- 시각은 모두 timestamptz (표준 시간대 없는 timestamp 금지)
SELECT pg_temp.none($q$SELECT c.relname AS table_name, a.attname AS column_name
                         FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
                          AND format_type(a.atttypid, a.atttypmod) = 'timestamp without time zone'$q$,
                    '시각 열은 모두 timestamptz 다 (timestamp without time zone 없음)');

-- README 의 표 목록·ERD 가 읽는 설명: 모든 표와 뷰에 COMMENT 가 있고 "— 기능 ID/구분" 으로 끝난다
SELECT pg_temp.none($q$SELECT c.relname AS undocumented
                         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v')
                          AND (obj_description(c.oid, 'pg_class') IS NULL OR obj_description(c.oid, 'pg_class') !~ ' — .+$')$q$,
                    '모든 표·뷰에 "설명 — 기능 ID" 형식의 COMMENT 가 있다');

-- 삭제 때 따라 지워지거나(CASCADE) NULL 로 바뀌는(SET NULL) 외래 키에는 색인이 있다 (없으면 부모 삭제 때 자식 표 전체를 훑어요)
SELECT pg_temp.none($q$SELECT con.conrelid::regclass AS child_table, con.conname AS foreign_key
                         FROM pg_constraint con
                        WHERE con.contype = 'f' AND con.confdeltype IN ('c', 'n')
                          AND NOT EXISTS (SELECT 1 FROM pg_index i
                                           WHERE i.indrelid = con.conrelid AND i.indisvalid AND i.indkey[0] = con.conkey[1])$q$,
                    'CASCADE/SET NULL 외래 키의 첫 열이 색인(또는 기본 키·고유 제약)의 맨 앞에 있다');

-- 한 번 기록하면 바꿀 수 없는 표에는 보호 트리거가 붙어 있다
SELECT pg_temp.none($q$SELECT t.name AS table_without_guard
                         FROM (VALUES ('proposal_versions'), ('activities'), ('certificates'), ('certificate_verifications'), ('admin_actions')) t(name)
                        WHERE NOT EXISTS (SELECT 1 FROM pg_trigger g WHERE g.tgrelid = t.name::regclass AND NOT g.tgisinternal)$q$,
                    '기록용 표(제출 버전·활동·증명서·확인 기록·감사 로그)에는 보호 트리거가 있다');

-- 설계에 쓰는 PostgreSQL 기능이 실제로 들어 있다 (README 의 설명과 어긋나지 않게)
SELECT pg_temp.eq((SELECT count(*) FROM pg_constraint WHERE contype = 'x')::int, 1, '겹침 방지(EXCLUDE) 제약이 하나 있다 (면접 일정)');
SELECT pg_temp.ok((SELECT count(*) FROM pg_attribute WHERE attgenerated = 's' AND attnum > 0 AND NOT attisdropped) >= 8, '생성 열(GENERATED)로 계산 규칙을 DB 가 직접 지킨다');
SELECT pg_temp.ok((SELECT count(*) FROM pg_trigger WHERE tgconstraint <> 0 AND tgdeferrable) >= 1, '트랜잭션 끝에서 검사하는 지연 제약 트리거가 있다 (제출 건은 파일 필수)');
\echo '01_structure: 통과'
