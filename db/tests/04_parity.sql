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

ROLLBACK;
\echo '04_parity: 통과'
