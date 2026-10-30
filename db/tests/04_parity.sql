-- 앱(packages/core) ↔ DB 대조: 같은 규칙을 두 곳에서 지키므로, 어긋나면 여기서 바로 드러나요.
-- 정답표 golden.sql 은 scripts/gen-db-reference.ts 가 core 의 함수로 계산해 둔 값이에요.
\ir helpers.sql
BEGIN;
\ir fixtures.sql
\ir golden.sql

-- 0) 열거형: 앱(core)의 유니온 타입 값이 DB 열거형에 모두 있고, "정확히 같아야 하는" 것은 여분도 없다
SELECT pg_temp.none($q$SELECT g.enum_name, g.label AS missing_in_db
                         FROM golden_enums g
                        WHERE NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = g.enum_name AND e.enumlabel = g.label)$q$,
                    'core 의 모든 열거 값이 DB 열거형에 있다');
SELECT pg_temp.none($q$SELECT t.typname, e.enumlabel AS only_in_db
                         FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                        WHERE t.typname IN (SELECT enum_name FROM golden_enums WHERE exact)
                          AND NOT EXISTS (SELECT 1 FROM golden_enums g WHERE g.enum_name = t.typname AND g.label = e.enumlabel)$q$,
                    '"정확히 같아야 하는" 열거형에는 DB 쪽 여분 값이 없다');

-- 1) Impact: SDG 점수 = 100×(1−e^(−포인트/300)), 레벨 경계값 [0, 300, 700, 1500, 2500]
SELECT pg_temp.none($q$SELECT g.raw_points, g.score AS core, impact_sdg_score(g.raw_points) AS db
                         FROM golden_sdg_scores g WHERE impact_sdg_score(g.raw_points) <> g.score$q$,
                    'impact_sdg_score 가 core 의 SDG 점수와 모두 같다 (포인트 0~6000)');
SELECT pg_temp.none($q$SELECT g.points, g.level AS core, impact_level(g.points) AS db
                         FROM golden_levels g WHERE impact_level(g.points) <> g.level$q$,
                    'impact_level 이 core 의 레벨 경계값과 같다');

-- 2) 수수료: 기부 = 내림, 나머지 = 운영 수익 (합계는 항상 수수료와 같다) — 진짜 matches 표의 생성 열로 확인
--    (부모 행 없이 계산만 보려고 이 트랜잭션 안에서만 외래 키 검사를 끄고, 곧바로 되돌려요)
SET LOCAL session_replication_role = replica;
INSERT INTO matches (id, challenge_id, company_id, proposal_id, adopted_by, fee_yen)
  SELECT gen_random_uuid(), gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', gen_random_uuid(),
         'b0000000-0000-0000-0000-000000000001', fee_yen
    FROM golden_fees;
SET LOCAL session_replication_role = origin;
SELECT pg_temp.none($q$SELECT m.fee_yen, g.donation_yen AS core_donation, m.donation_yen AS db_donation, g.revenue_yen AS core_revenue, m.revenue_yen AS db_revenue
                         FROM matches m JOIN golden_fees g USING (fee_yen)
                        WHERE m.donation_yen <> g.donation_yen OR m.revenue_yen <> g.revenue_yen$q$,
                    '수수료 분할(기부/운영 수익)이 core 의 splitMatchFee 와 같다');
SELECT pg_temp.eq((SELECT count(*) FROM matches WHERE fee_yen = 30000 AND donation_yen = 15000 AND revenue_yen = 15000)::int, 1,
                  '¥30,000 → 기부 ¥15,000 + 운영 ¥15,000');
DELETE FROM matches;

-- 3) 인증마크: 항목별 점수 (증빙이 없으면 0점, 값은 최댓값까지, 소수 첫째 자리)
SELECT pg_temp.none($q$SELECT g.code, g.value, g.evidence, g.points AS core, cert_item_points(g.code, g.value, g.evidence) AS db
                         FROM golden_cert_items g WHERE cert_item_points(g.code, g.value, g.evidence) <> g.points$q$,
                    'cert_item_points 가 core 의 항목별 점수와 모두 같다');

-- 4) 인증마크: 여섯 항목 합계 → 점수·레벨 (제출하는 순간 서버가 다시 계산해요)
CREATE TEMP TABLE parity_cert_result (case_no integer, total integer, level integer);
DO $$
DECLARE
  r record;
  app uuid;
BEGIN
  FOR r IN SELECT case_no FROM golden_cert_totals ORDER BY case_no LOOP
    INSERT INTO cert_applications (company_id) VALUES ('d0000000-0000-0000-0000-000000000001') RETURNING id INTO app;
    INSERT INTO cert_answers (application_id, criterion_code, value, evidence_key)
      SELECT app, code, value, CASE WHEN evidence THEN 'evidence/' || code END FROM golden_cert_cases WHERE case_no = r.case_no;
    UPDATE cert_applications SET status = 'submitted' WHERE id = app;
    INSERT INTO parity_cert_result SELECT r.case_no, score, level FROM cert_applications WHERE id = app;
  END LOOP;
END $$;
SELECT pg_temp.none($q$SELECT g.case_no, g.total AS core_total, p.total AS db_total, g.level AS core_level, p.level AS db_level
                         FROM golden_cert_totals g JOIN parity_cert_result p USING (case_no)
                        WHERE g.total <> p.total OR g.level <> p.level$q$,
                    '인증마크 합계 점수·레벨이 core 의 evaluateCertification 과 300건 모두 같다');

-- 5) 디지털 증명서: core 가 만든 해시를 DB 가 같은 글자열로 다시 계산해서 받아들인다 (한글·일본어·이모지·따옴표·줄바꿈 포함)
INSERT INTO certificates (serial_no, user_id, kind, holder_name, challenge_title, company_name, award_kind, sdg_ids, points, issued_on, content_hash)
  SELECT serial_no, 'c0000000-0000-0000-0000-000000000001', kind::cert_kind, holder_name, challenge_title, company_name, award_kind::award_kind, sdg_ids, points, issued_on, content_hash
    FROM golden_certificates;
SELECT pg_temp.eq((SELECT count(*) FROM certificates)::int, (SELECT count(*) FROM golden_certificates)::int, '증명서 해시를 DB 가 모두 같은 값으로 재계산했다');
SELECT pg_temp.none($q$SELECT g.serial_no, g.verify_code AS core_code, c.verify_code AS db_code, g.qr_payload AS core_qr, c.qr_payload AS db_qr
                         FROM golden_certificates g JOIN certificates c USING (serial_no)
                        WHERE g.verify_code <> c.verify_code OR g.qr_payload <> c.qr_payload$q$,
                    '확인 코드(verifyCode)와 QR 문구(qrPayload)가 core 와 같다');

-- 6) SNS 피드 (F-503 학생 자랑 글 · F-504 기업 홍보 글, docs/sns-feed.md §5)
--    앱의 규칙(packages/core/src/post.ts)을 표로 만든 golden_post_* · golden_official_dates 와 DB 가 같은 답을 내는지 대조해요.
--    샘플 글 8개(packages/data)는 읽지 않아요 — CI 의 db 작업은 npm ci 없이 돌아서 packages/data 를 불러올 수 없어요.
--    샘플 글이 같은 규칙(charCount·containsContact·POST_LIMITS)을 지키는지는 packages/data/src/seed.test.ts 가 core 의 같은 함수로 확인해요.
\ir feed_fixtures.sql
\ir feed_world.sql

-- 6-1) 한도: POST_LIMITS 와 공식 게시료 — 경계 글자 수(N자는 받고 N+1자는 거절)를 실제로 넣어 같은 값인지 확인해요
SELECT pg_temp.none($q$SELECT name AS unknown_limit FROM golden_post_limits
                        WHERE name NOT IN ('bragBody', 'prTitle', 'prBody', 'maxSdgs', 'officialFeeYen')$q$,
                    'core 에 새 한도가 생기면 이 대조에도 넣어야 한다 (지금 아는 한도: bragBody · prTitle · prBody · maxSdgs · officialFeeYen)');
SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001',
                       repeat('あ', (SELECT value FROM golden_post_limits WHERE name = 'bragBody')));
SELECT pg_temp.ok(true, 'POST_LIMITS.bragBody 글자의 자랑 글 본문을 DB 도 받아들인다');
SELECT pg_temp.fails(format($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', repeat('あ', %s))$s$,
                            (SELECT value + 1 FROM golden_post_limits WHERE name = 'bragBody')),
                     '23514', 'bragBody + 1 글자는 DB 도 거절한다');
SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
                     repeat('題', (SELECT value FROM golden_post_limits WHERE name = 'prTitle')), repeat('文', (SELECT value FROM golden_post_limits WHERE name = 'prBody')));
SELECT pg_temp.ok(true, 'POST_LIMITS.prTitle · prBody 글자의 홍보 글을 DB 도 받아들인다');
SELECT pg_temp.fails(format($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', repeat('題', %s))$s$,
                            (SELECT value + 1 FROM golden_post_limits WHERE name = 'prTitle')),
                     '23514', 'prTitle + 1 글자는 DB 도 거절한다');
SELECT pg_temp.fails(format($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '題', repeat('文', %s))$s$,
                            (SELECT value + 1 FROM golden_post_limits WHERE name = 'prBody')),
                     '23514', 'prBody + 1 글자는 DB 도 거절한다');
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
                     p_sdgs => (SELECT array_agg(g::smallint ORDER BY g) FROM generate_series(1, (SELECT value FROM golden_post_limits WHERE name = 'maxSdgs')::int) AS g));
SELECT pg_temp.eq((SELECT count(*) FROM social_post_sdgs WHERE post_id = '90000000-0000-0000-0000-0000000000a1')::int, (SELECT value FROM golden_post_limits WHERE name = 'maxSdgs'),
                  'POST_LIMITS.maxSdgs 개의 태그를 DB 도 받아들인다');
SELECT pg_temp.fails(format($s$INSERT INTO social_post_sdgs (post_id, position, sdg_id) VALUES ('90000000-0000-0000-0000-0000000000a1', %s, %s)$s$,
                            (SELECT value + 1 FROM golden_post_limits WHERE name = 'maxSdgs'), (SELECT value + 1 FROM golden_post_limits WHERE name = 'maxSdgs')),
                     '23514', 'maxSdgs + 1 번째 태그는 DB 도 거절한다');
INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-0000000000a1', jst_date(now()) + 1);
SELECT pg_temp.eq((SELECT fee_yen FROM official_share_slots WHERE post_id = '90000000-0000-0000-0000-0000000000a1'), (SELECT value FROM golden_post_limits WHERE name = 'officialFeeYen'),
                  'OFFICIAL_SHARE_FEE_YEN 이 공식 게시 신청의 기본 게시료와 같다');
DELETE FROM social_posts WHERE id = '90000000-0000-0000-0000-0000000000a1';

-- 6-2) 글자 수: charCount(= 앞뒤 공백을 자르고 코드포인트를 센다) ↔ post_char_count
SELECT pg_temp.none($q$SELECT g.case_no, g.label, g.chars AS core, post_char_count(g.content) AS db
                         FROM golden_post_chars g WHERE post_char_count(g.content) <> g.chars$q$,
                    'post_char_count 가 core 의 charCount 와 모두 같다 (이모지·결합 문자·전각 공백·NBSP·BOM·NEL 등)');
SELECT pg_temp.none($q$SELECT c.code_point, to_hex(c.code_point) AS hex
                         FROM generate_series(1, 65535) AS c(code_point)
                        WHERE CASE WHEN c.code_point BETWEEN 55296 AND 57343 THEN false     -- 서로게이트는 글자가 아니에요
                                   ELSE (post_char_count(chr(c.code_point) || 'あ' || chr(c.code_point)) = 1) <> (c.code_point IN (SELECT code_point FROM golden_trim_chars)) END$q$,
                    '앞뒤에서 잘라 내는 글자가 JS trim() 과 같다 — BMP 65,000여 글자를 하나씩 비교 (golden_trim_chars 이외는 자르지 않는다)');

-- 6-3) 연락처: containsContact ↔ mask_contacts(text) <> text
SELECT pg_temp.none($q$SELECT g.case_no, g.content, g.has_contact AS core, (mask_contacts(g.content) <> g.content) AS db
                         FROM golden_post_contacts g WHERE (mask_contacts(g.content) <> g.content) <> g.has_contact$q$,
                    'DB 의 연락처 검출(mask_contacts)이 core 의 containsContact 와 모두 같다 (이메일·전화번호·평범한 숫자)');
SELECT pg_temp.ok((SELECT count(*) FILTER (WHERE has_contact) FROM golden_post_contacts) >= 10
              AND (SELECT count(*) FILTER (WHERE NOT has_contact) FROM golden_post_contacts) >= 10, '연락처가 있는 사례와 없는 사례가 모두 충분히 들어 있다');

-- 6-4) 공식 SNS 게시 날짜: nextOfficialDate(posts, today) ↔ next_official_share_date(today)
--      (core 에서는 홍보 글의 official.on 이 "이미 받은 날짜"예요. 같은 날짜로 신청 행을 만들어 두고 DB 에 물어봐요.)
CREATE TEMP TABLE parity_official_result (case_no integer PRIMARY KEY, next_on date);
DO $$
DECLARE
  r record;
  taken_on date;
  pid uuid;
BEGIN
  FOR r IN SELECT * FROM golden_official_dates ORDER BY case_no LOOP
    FOREACH taken_on IN ARRAY r.taken LOOP
      pid := gen_random_uuid();
      PERFORM pg_temp.mk_pr(pid, 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001');
      -- 신청 시각을 아주 옛날로 두어, 골든의 날짜가 "신청한 날의 다음 날 이후" 규칙에 걸리지 않게 해요
      INSERT INTO official_share_slots (post_id, scheduled_on, requested_at) VALUES (pid, taken_on, timestamptz '2020-01-01 09:00+09');
    END LOOP;
    INSERT INTO parity_official_result VALUES (r.case_no, next_official_share_date(r.today));
    DELETE FROM official_share_slots;
  END LOOP;
END $$;
SELECT pg_temp.eq((SELECT count(*) FROM parity_official_result)::int, (SELECT count(*) FROM golden_official_dates)::int, '날짜 대조: 모든 사례를 DB 에 물어보았다');
SELECT pg_temp.none($q$SELECT g.case_no, g.label, g.today, g.taken, g.next_on AS core, r.next_on AS db
                         FROM golden_official_dates g JOIN parity_official_result r USING (case_no) WHERE g.next_on IS DISTINCT FROM r.next_on$q$,
                    'next_official_share_date 가 core 의 nextOfficialDate 와 모두 같다 (월말·연말·윤년 포함)');

-- 6-5) 입력 검사: 앱(validatePostDraft)이 받아들이는 글은 DB 도 받아들이고, 거절하는 글은 DB 도 거절한다 — 같은 이유로
--      사례를 하나씩 실제 INSERT 로 옮겨요. 받아들여진 글도 곧바로 되돌려서 다음 사례에 영향을 주지 않아요.
--      brag: Mina(c..01) + 실적 own = 내 참가 실적 · other = Rin 의 실적 · share = 카드뉴스 공유 기록 / pr: 기업 d..01 의 대표(b..01), 챌린지 own = e1..01 · other = 다른 기업(d..03)의 챌린지
CREATE TEMP TABLE parity_post_result (case_no integer PRIMARY KEY, accepted boolean NOT NULL, error text);
DO $$
DECLARE
  r record;
  new_id uuid;
  accepted boolean;
  failure text;
BEGIN
  FOR r IN SELECT * FROM golden_post_cases ORDER BY case_no LOOP
    new_id := gen_random_uuid();
    accepted := false;
    failure := NULL;
    BEGIN
      IF r.kind = 'brag' THEN
        INSERT INTO social_posts (id, kind, author_id, activity_id, body)
        VALUES (new_id, 'brag', 'c0000000-0000-0000-0000-000000000001',
                CASE r.activity WHEN 'own'   THEN 'ac100000-0000-0000-0000-000000000001'::uuid
                                WHEN 'other' THEN 'ac100000-0000-0000-0000-000000000002'::uuid
                                WHEN 'share' THEN 'ac100000-0000-0000-0000-000000000005'::uuid END,
                r.body);
        INSERT INTO social_post_sdgs (post_id, position, sdg_id)
          SELECT new_id, ord, sdg FROM unnest(ARRAY[14, 12, 13]::smallint[]) WITH ORDINALITY AS t(sdg, ord);
      ELSE
        INSERT INTO social_posts (id, kind, author_id, company_id, challenge_id, title, body)
        VALUES (new_id, 'pr', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
                CASE r.challenge WHEN 'own'   THEN 'e1000000-0000-0000-0000-000000000001'::uuid
                                 WHEN 'other' THEN 'e1000000-0000-0000-0000-0000000000c3'::uuid END,
                r.title, r.body);
        INSERT INTO social_post_sdgs (post_id, position, sdg_id)
          SELECT new_id, g, (ARRAY[14, 12, 13, 11, 7])[g] FROM generate_series(1, r.sdg_count) AS g;
      END IF;
      SET CONSTRAINTS social_posts_has_sdg IMMEDIATE;   -- 태그가 0개인 글은 여기서 거절돼요
      accepted := true;
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'parity-rollback';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'parity-rollback' THEN failure := SQLERRM; END IF;
    END;
    INSERT INTO parity_post_result VALUES (r.case_no, accepted, failure);
  END LOOP;
END $$;
SELECT pg_temp.eq((SELECT count(*) FROM parity_post_result)::int, (SELECT count(*) FROM golden_post_cases)::int, '입력 검사 대조: 모든 사례를 DB 에 넣어 보았다');
SELECT pg_temp.ok((SELECT count(*) FILTER (WHERE errors = '') FROM golden_post_cases) >= 8
              AND (SELECT count(*) FILTER (WHERE errors <> '') FROM golden_post_cases) >= 20, '받아들이는 사례와 거절하는 사례가 모두 충분히 들어 있다');
SELECT pg_temp.none($q$SELECT g.case_no, g.label, g.errors AS core_errors, r.accepted AS db_accepted, r.error AS db_error
                         FROM golden_post_cases g JOIN parity_post_result r USING (case_no) WHERE (g.errors = '') <> r.accepted$q$,
                    '앱이 받아들이는 글은 DB 도 받아들이고, 앱이 거절하는 글은 DB 도 거절한다');
SELECT pg_temp.none($q$SELECT g.case_no, g.label, g.errors AS core_error, r.error AS db_error
                         FROM golden_post_cases g JOIN parity_post_result r USING (case_no)
                        WHERE g.errors <> '' AND position(',' IN g.errors) = 0
                          AND r.error !~ CASE g.errors
                                WHEN 'title_required'        THEN 'social_posts_title_len|social_posts_kind_fields'
                                WHEN 'title_too_long'        THEN 'social_posts_title_len'
                                WHEN 'body_required'         THEN 'social_posts_body_len'
                                WHEN 'body_too_long'         THEN 'social_posts_body_len'
                                WHEN 'achievement_required'  THEN 'social_posts_kind_fields'
                                WHEN 'achievement_not_found' THEN 'social_posts_activity_id_author_id_fkey|실적만 붙일 수'
                                WHEN 'sdgs_required'         THEN '태그가 1개 이상'
                                WHEN 'sdgs_too_many'         THEN 'social_post_sdgs_position_check'
                                WHEN 'challenge_not_found'   THEN 'social_posts_challenge_id_company_id_fkey'
                                WHEN 'contact_info'          THEN 'social_posts_no_contact'
                                ELSE 'UNKNOWN-APP-ERROR' END$q$,
                    '앱의 오류 하나하나가 DB 의 같은 규칙(제약)에 대응한다 — 같은 이유로 거절한다');

ROLLBACK;
\echo '04_parity: 통과'
