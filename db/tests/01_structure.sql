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
-- SNS 피드(F-503 학생 자랑 글 · F-504 기업 홍보 글): 약속한 구조가 카탈로그에 실제로 있다 (규칙을 어기는 입력이 막히는지는 06_feed.sql 이 확인해요)
SELECT pg_temp.eq((SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'post_kind'::regtype), 'brag,pr', '글 종류는 자랑(brag)과 홍보(pr) 두 가지다');
SELECT pg_temp.eq((SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'official_status'::regtype), 'scheduled,posted,cancelled', '공식 SNS 게시 신청 상태는 예정·게시 완료·취소다');
SELECT pg_temp.eq((SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'official_channel'::regtype), 'instagram,x,facebook', '공식 SNS 게시 채널은 Instagram · X · Facebook 이다 (YouTube 는 영상 채널이라 대상이 아니다)');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'official_share_slots' AND column_name = 'channel' AND is_nullable = 'NO' AND column_default LIKE '''instagram''%'),
                  '게시 신청의 채널은 비워 둘 수 없고, 말하지 않으면 instagram 이다 (채널이 없던 때의 신청과 호환)');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'report_target'::regtype AND enumlabel = 'post'), '신고 대상에 피드 글(post)이 있다 (F-702)');
SELECT pg_temp.none($q$SELECT t.name AS table_without_guard
                         FROM (VALUES ('social_posts'), ('social_post_sdgs'), ('social_post_likes'), ('official_share_slots')) t(name)
                        WHERE NOT EXISTS (SELECT 1 FROM pg_trigger g WHERE g.tgrelid = t.name::regclass AND NOT g.tgisinternal AND NOT g.tgdeferrable)$q$,
                    'SNS 피드의 표 4개에는 한국어 메시지를 내는 가드 트리거가 있다');
SELECT pg_temp.eq((SELECT count(*) FROM pg_trigger WHERE tgconstraint <> 0 AND tgdeferrable AND tgrelid IN ('social_posts'::regclass, 'social_post_sdgs'::regclass))::int, 2,
                  '글에 SDGs 태그가 1개 이상 있는지는 트랜잭션 끝에서 검사한다 (지연 제약 트리거 2개: 글을 올릴 때 · 태그를 지울 때)');
SELECT pg_temp.eq((SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'official_share_slots_one_per_channel_day'
                      AND indexdef LIKE 'CREATE UNIQUE INDEX%' AND indexdef LIKE '%(channel, scheduled_on)%' AND indexdef LIKE '%WHERE%')::int, 1,
                  '공식 SNS 게시는 예정·게시 완료 상태에서 채널마다 하루에 한 건만 (채널 + 날짜의 부분 유일 인덱스)');
SELECT pg_temp.eq((SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'official_share_slots_one_per_day')::int, 0,
                  '채널이 없던 때의 "하루 한 건" 인덱스는 남아 있지 않다 (남아 있으면 같은 날 다른 채널이 막혀요)');
SELECT pg_temp.eq((SELECT count(*) FROM pg_constraint WHERE conrelid = 'social_posts'::regclass AND contype = 'f' AND conname IN ('social_posts_activity_id_author_id_fkey', 'social_posts_challenge_id_company_id_fkey'))::int, 2,
                  '"내 실적만" · "우리 기업의 챌린지만" 은 복합 외래 키로 지킨다 (활동 + 글쓴이 · 챌린지 + 기업)');
SELECT pg_temp.ok((SELECT count(*) FROM pg_proc WHERE proname IN ('post_char_count', 'next_official_share_date')) = 2, '글자 수 함수와 공식 게시 날짜 함수가 있다 (core 의 charCount · nextOfficialDate 와 04_parity.sql 이 대조)');
SELECT pg_temp.ok(to_regprocedure('next_official_share_date(date, official_channel)') IS NOT NULL, '공식 게시 날짜 함수는 (기준일, 채널) 을 받는다 — 둘 다 생략할 수 있다 (core 의 nextOfficialDate(posts, today, channel))');
\echo '01_structure: 통과'
