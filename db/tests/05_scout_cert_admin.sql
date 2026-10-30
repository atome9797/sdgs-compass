-- 인재 검색·스카우트·메시지·면접(F-601~F-603), ESG 리포트·SDGs 인증마크(F-403), 운영·감사·통계(F-701~F-703)의 규칙
\ir helpers.sql
BEGIN;
\ir fixtures.sql

-- ───────── F-601 인재 검색 ─────────
SELECT pg_temp.eq((SELECT string_agg(nickname, ',' ORDER BY nickname) FROM talent_directory), 'Kai,Mina,Ren,Rin', '인재 검색에는 공개를 허용한 학생만 보인다 (비공개 Mei 는 제외)');
SELECT pg_temp.eq((SELECT total_points || ' Lv.' || level FROM talent_directory WHERE nickname = 'Mina'), '0 Lv.1', '활동이 없는 학생도 0 pt · Lv.1 로 나온다');
UPDATE users SET status = 'suspended' WHERE id = 'c0000000-0000-0000-0000-000000000004';
SELECT pg_temp.eq((SELECT count(*) FROM talent_directory WHERE nickname = 'Ren')::int, 0, '정지된 계정은 인재 검색에서 빠진다');
UPDATE users SET status = 'active' WHERE id = 'c0000000-0000-0000-0000-000000000004';

-- ───────── F-602 스카우트 ─────────
SELECT pg_temp.eq(jst_date('2026-10-30 14:59:59+00'), DATE '2026-10-30', '일본 시간 23:59:59 는 그날 (jst_date)');
SELECT pg_temp.eq(jst_date('2026-10-30 15:00:00+00'), DATE '2026-10-31', '일본 시간 0시가 되면 다음 날 (jst_date)');
SELECT pg_temp.fails($s$INSERT INTO scouts (company_id, sender_id, student_id, kind, message)
                        VALUES ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000001', 'internship', 'hi')$s$,
                     '23514', '승인 전 기업은 스카우트를 보낼 수 없다');
SELECT pg_temp.fails($s$INSERT INTO scouts (company_id, sender_id, student_id, kind, message)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'internship', 'hi')$s$,
                     '23503', '기업 구성원이 아닌 사람은 스카우트를 보낼 수 없다');
SELECT pg_temp.fails($s$INSERT INTO scouts (company_id, sender_id, student_id, kind, message)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'internship', 'hi')$s$,
                     '23514', '스카우트를 받지 않는 학생에게는 보낼 수 없다 (F-601)');
SELECT pg_temp.fails($s$INSERT INTO scouts (company_id, sender_id, student_id, kind, message)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'internship', '   ')$s$,
                     '23514', '빈 메시지는 보낼 수 없다');
INSERT INTO scouts (id, company_id, sender_id, student_id, kind, message) VALUES
  ('5c000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'internship', '動画提案を拝見しました。インターンに来ませんか？');
SELECT pg_temp.fails($s$INSERT INTO scouts (company_id, sender_id, student_id, kind, message)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'offer', '다시')$s$,
                     '23505', '같은 학생에게 거듭 보낼 수 없다');
INSERT INTO scouts (company_id, sender_id, student_id, kind, message) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'interview', '2通目'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'offer', '3通目');
SELECT pg_temp.fails($s$INSERT INTO scouts (company_id, sender_id, student_id, kind, message)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'offer', '4通目')$s$,
                     '23514', '하루에 보낼 수 있는 스카우트는 3건까지다 (SCOUT_DAILY_LIMIT)');
INSERT INTO scouts (company_id, sender_id, student_id, kind, message, sent_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'offer', '前日の分', now() - interval '1 day');
SELECT pg_temp.ok(true, '날짜(일본 시간)가 다르면 다시 보낼 수 있다');
SELECT pg_temp.fails($s$UPDATE scouts SET status = 'accepted' WHERE id = '5c000000-0000-0000-0000-000000000001'$s$, '23514', '수락·거절에는 응답 시각이 있어야 한다');

-- ───────── F-603 1:1 메시지 · 연락처 마스킹 · 면접 일정 ─────────
INSERT INTO conversations (id, company_id, student_id, scout_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000001');
SELECT pg_temp.fails($s$INSERT INTO conversations (company_id, student_id) VALUES ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')$s$, '23505', '기업-학생 대화방은 하나뿐이다');
SELECT pg_temp.fails($s$INSERT INTO messages (conversation_id, sender_id, body) VALUES ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'こんにちは')$s$,
                     '23514', '대화방 참가자가 아닌 사람은 메시지를 보낼 수 없다');
INSERT INTO messages (id, conversation_id, sender_id, body) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '連絡は mina.test@example.com か 090-1234-5678 までお願いします'),
  ('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '打ち合わせは2026-10-30 の15時でいかがですか？'),
  ('c2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Call +81 90 1234 5678 or 010-9876-5432');
SELECT pg_temp.eq((SELECT body_masked FROM messages WHERE id = 'c2000000-0000-0000-0000-000000000001'), '連絡は ***@*** か ***-****-**** までお願いします', '이메일·전화번호는 마스킹된다');
SELECT pg_temp.eq((SELECT body_masked FROM messages WHERE id = 'c2000000-0000-0000-0000-000000000002'), (SELECT body FROM messages WHERE id = 'c2000000-0000-0000-0000-000000000002'), '날짜(2026-10-30)는 전화번호로 오해해 가리지 않는다');
SELECT pg_temp.eq((SELECT body_masked FROM messages WHERE id = 'c2000000-0000-0000-0000-000000000003'), 'Call ***-****-**** or ***-****-****', '국제 번호·한국 번호도 마스킹된다');
SELECT pg_temp.ok((SELECT contact_released_at IS NULL FROM conversations WHERE id = 'c1000000-0000-0000-0000-000000000001'), '스카우트를 수락하기 전에는 연락처가 가려진 채로 보인다');
UPDATE scouts SET status = 'accepted', responded_at = now() WHERE id = '5c000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok((SELECT contact_released_at IS NOT NULL FROM conversations WHERE id = 'c1000000-0000-0000-0000-000000000001'), '학생이 스카우트를 수락하면 연락처 마스킹이 풀린다');

INSERT INTO interview_slots (conversation_id, proposed_by, starts_at, ends_at, status) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-20 05:00+00', '2026-11-20 06:00+00', 'confirmed'),
  ('c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-20 05:30+00', '2026-11-20 06:30+00', 'proposed'),
  ('c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-20 06:00+00', '2026-11-20 07:00+00', 'confirmed');
SELECT pg_temp.ok(true, '제안(proposed) 단계의 겹침과 맞닿은 확정 일정(06:00 끝/시작)은 허용된다');
SELECT pg_temp.fails($s$INSERT INTO interview_slots (conversation_id, proposed_by, starts_at, ends_at, status)
                        VALUES ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-11-20 05:30+00', '2026-11-20 05:45+00', 'confirmed')$s$,
                     '23P01', '같은 대화방에서 확정된 면접 시간이 겹칠 수 없다 (EXCLUDE)');
SELECT pg_temp.fails($s$INSERT INTO interview_slots (conversation_id, proposed_by, starts_at, ends_at)
                        VALUES ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-11-21 05:00+00', '2026-11-21 04:00+00')$s$,
                     '23514', '끝나는 시각이 시작보다 빠를 수 없다');
SELECT pg_temp.fails($s$INSERT INTO interview_slots (conversation_id, proposed_by, starts_at, ends_at, meeting_url)
                        VALUES ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-11-21 05:00+00', '2026-11-21 06:00+00', 'http://meet.example.com/x')$s$,
                     '23514', '면접 링크는 https 만 받는다');

-- ───────── F-403 ESG 리포트 ─────────
INSERT INTO esg_reports (company_id, period_start, period_end, file_format, file_key, generated_by, snapshot)
  VALUES ('d0000000-0000-0000-0000-000000000001', '2026-04-01', '2026-09-30', 'pdf', 'reports/esg-2026h1.pdf', 'b0000000-0000-0000-0000-000000000001', '{"challenges": 4, "applicants": 128, "donationYen": 15000}');
SELECT pg_temp.fails($s$INSERT INTO esg_reports (company_id, period_start, period_end, file_format, file_key, generated_by)
                        VALUES ('d0000000-0000-0000-0000-000000000001', '2026-10-01', '2026-09-30', 'pdf', 'k', 'b0000000-0000-0000-0000-000000000001')$s$, '23514', '기간의 끝이 시작보다 빠를 수 없다');
SELECT pg_temp.fails($s$INSERT INTO esg_reports (company_id, period_start, period_end, file_format, file_key, generated_by)
                        VALUES ('d0000000-0000-0000-0000-000000000001', '2026-04-01', '2026-09-30', 'docx', 'k', 'b0000000-0000-0000-0000-000000000001')$s$, '23514', '리포트는 PDF·Excel 만 만든다');

-- ───────── 인증마크: ① 입력 → ② 증빙 → ③ 기준을 넘으면 부여 ─────────
INSERT INTO cert_applications (id, company_id) VALUES
  ('ce000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000001'),
  ('ce000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-000000000001'),
  ('ce000000-0000-0000-0000-00000000000c', 'd0000000-0000-0000-0000-000000000001');
SELECT pg_temp.fails($s$INSERT INTO cert_answers (application_id, criterion_code, value) VALUES ('ce000000-0000-0000-0000-00000000000a', 'ecoPackage', 101)$s$, '23514', '입력값이 최댓값(100%)을 넘으면 거절한다');
SELECT pg_temp.fails($s$INSERT INTO cert_answers (application_id, criterion_code, value) VALUES ('ce000000-0000-0000-0000-00000000000a', 'unknownCriterion', 1)$s$, '23503', '심사 기준표에 없는 항목은 거절한다');
-- 신청 A: 여성 관리직 항목에 증빙 없음 (→ 0점) / 신청 B: 같은 값에 증빙 있음
INSERT INTO cert_answers (application_id, criterion_code, value, evidence_key)
  SELECT app, code, value, CASE WHEN evidence THEN 'evidence/' || code END
    FROM (VALUES ('ecoPackage', 60, true), ('renewable', 20, true), ('donation', 150000, true), ('womenManagers', 20, false), ('volunteer', 8, true), ('disclosure', 1, true)) v(code, value, evidence)
   CROSS JOIN (VALUES ('ce000000-0000-0000-0000-00000000000a'::uuid)) a(app);
INSERT INTO cert_answers (application_id, criterion_code, value, evidence_key)
  SELECT 'ce000000-0000-0000-0000-00000000000b', code, value, 'evidence/' || code
    FROM (VALUES ('ecoPackage', 60), ('renewable', 20), ('donation', 150000), ('womenManagers', 20), ('volunteer', 8), ('disclosure', 1)) v(code, value);
SELECT pg_temp.eq((SELECT points FROM cert_answers WHERE application_id = 'ce000000-0000-0000-0000-00000000000a' AND criterion_code = 'womenManagers'), 0::numeric(4,1), '증빙이 없는 항목은 0점이다');
SELECT pg_temp.eq((SELECT points FROM cert_answers WHERE application_id = 'ce000000-0000-0000-0000-00000000000b' AND criterion_code = 'womenManagers'), 10.0::numeric(4,1), '증빙이 있으면 배점 15 × (20/30) = 10.0 점이다');
UPDATE cert_applications SET status = 'submitted' WHERE id IN ('ce000000-0000-0000-0000-00000000000a', 'ce000000-0000-0000-0000-00000000000b', 'ce000000-0000-0000-0000-00000000000c');
SELECT pg_temp.eq((SELECT score || ' ★' || level FROM cert_applications WHERE id = 'ce000000-0000-0000-0000-00000000000a'), '70 ★2', '신청 A(증빙 하나 부족): 70점 ★2');
SELECT pg_temp.eq((SELECT score || ' ★' || level FROM cert_applications WHERE id = 'ce000000-0000-0000-0000-00000000000b'), '80 ★3', '신청 B(증빙 모두 있음): 80점 ★3');
SELECT pg_temp.eq((SELECT score || ' ★' || level FROM cert_applications WHERE id = 'ce000000-0000-0000-0000-00000000000c'), '0 ★0', '아무것도 입력하지 않으면 0점 ★0');
SELECT pg_temp.ok((SELECT submitted_at IS NOT NULL FROM cert_applications WHERE id = 'ce000000-0000-0000-0000-00000000000a'), '제출하면 제출 시각이 기록된다');
SELECT pg_temp.fails($s$UPDATE cert_answers SET value = 100 WHERE application_id = 'ce000000-0000-0000-0000-00000000000a' AND criterion_code = 'ecoPackage'$s$, '23514', '제출한 신청서의 답변은 고칠 수 없다');
SELECT pg_temp.fails($s$UPDATE cert_applications SET status = 'granted', decided_at = now(), decided_by = 'a0000000-0000-0000-0000-000000000001' WHERE id = 'ce000000-0000-0000-0000-00000000000c'$s$,
                     '23514', '기준(★1 = 40점)에 못 미치면 인증마크를 줄 수 없다');
SELECT pg_temp.fails($s$UPDATE cert_applications SET status = 'granted', decided_at = now(), decided_by = 'a0000000-0000-0000-0000-000000000001' WHERE id = 'ce000000-0000-0000-0000-00000000000b'$s$,
                     '23514', '유효 기간(valid_until) 없이 인증마크를 줄 수 없다');
UPDATE cert_applications SET status = 'granted', decided_at = now(), decided_by = 'a0000000-0000-0000-0000-000000000001', valid_until = current_date + 365 WHERE id = 'ce000000-0000-0000-0000-00000000000b';
SELECT pg_temp.ok(true, '80점 · 증빙 완비 · 유효 기간이 있으면 인증마크(★3)를 부여할 수 있다');

-- ───────── F-702 신고 · F-701 블랙리스트 · 감사 로그 ─────────
INSERT INTO challenges (id, company_id, created_by, title, summary, created_at, closes_at)
  VALUES ('e0000000-0000-0000-0000-0000000000e1', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 't', 's', now(), now() + interval '30 days');
INSERT INTO reports (id, reporter_id, target_type, target_id, reason, detail) VALUES
  ('e5000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'challenge', 'e0000000-0000-0000-0000-0000000000e1', 'copyright', '画像が無断転載です');
SELECT pg_temp.fails($s$INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ('c0000000-0000-0000-0000-000000000001', 'challenge', 'e0000000-0000-0000-0000-0000000000e1', 'spam')$s$, '23505', '같은 사람이 같은 대상을 두 번 신고할 수 없다');
SELECT pg_temp.fails($s$UPDATE reports SET status = 'blinded' WHERE id = 'e5000000-0000-0000-0000-000000000001'$s$, '23514', '처리 시각 없이 신고를 처리 완료로 바꿀 수 없다');
UPDATE reports SET status = 'blinded', handled_by = 'a0000000-0000-0000-0000-000000000001', handled_at = now() WHERE id = 'e5000000-0000-0000-0000-000000000001';

INSERT INTO blacklist_entries (id, user_id, reason, created_by) VALUES ('b1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', '無断転載の繰り返し', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT status FROM users WHERE id = 'c0000000-0000-0000-0000-000000000004')::text, 'blacklisted', '블랙리스트에 올리면 계정 상태가 blacklisted 가 된다');
SELECT pg_temp.fails($s$INSERT INTO blacklist_entries (user_id, reason, created_by) VALUES ('c0000000-0000-0000-0000-000000000004', '중복', 'a0000000-0000-0000-0000-000000000001')$s$, '23505', '이미 올라 있는 사용자를 또 올릴 수 없다');
SELECT pg_temp.fails($s$INSERT INTO blacklist_entries (user_id, company_id, reason, created_by) VALUES ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', '둘 다', 'a0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '사용자와 기업을 한 건에 함께 올릴 수 없다');
UPDATE blacklist_entries SET released_at = now() WHERE id = 'b1000000-0000-0000-0000-000000000001';
SELECT pg_temp.eq((SELECT status FROM users WHERE id = 'c0000000-0000-0000-0000-000000000004')::text, 'active', '해제하면 계정이 다시 active 가 된다');

INSERT INTO blacklist_entries (id, company_id, reason, created_by) VALUES ('b1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', '虚偽の事業者情報', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT status FROM companies WHERE id = 'd0000000-0000-0000-0000-000000000001')::text, 'suspended', '기업을 블랙리스트에 올리면 suspended 가 된다');
SELECT pg_temp.fails($s$INSERT INTO challenges (company_id, created_by, title, summary, created_at, closes_at)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 't', 's', now(), now() + interval '30 days')$s$,
                     '23514', '정지된 기업은 새 챌린지를 낼 수 없다');
SELECT pg_temp.fails($s$INSERT INTO scouts (company_id, sender_id, student_id, kind, message)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'offer', 'x')$s$,
                     '23514', '정지된 기업은 스카우트를 보낼 수 없다');
UPDATE blacklist_entries SET released_at = now() WHERE id = 'b1000000-0000-0000-0000-000000000002';
SELECT pg_temp.eq((SELECT status FROM companies WHERE id = 'd0000000-0000-0000-0000-000000000001')::text, 'approved', '해제하면 기업이 다시 approved 가 된다');

INSERT INTO admin_actions (admin_id, action, target_type, target_id, detail)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'company.approve', 'company', 'd0000000-0000-0000-0000-000000000001', '{"note": "서류 확인 완료"}');
SELECT pg_temp.fails($s$UPDATE admin_actions SET action = 'x.y'$s$, '23001', '감사 로그는 고칠 수 없다');
SELECT pg_temp.fails($s$DELETE FROM admin_actions$s$, '23001', '감사 로그는 지울 수 없다');
SELECT pg_temp.fails($s$INSERT INTO admin_actions (admin_id, action, target_type) VALUES ('a0000000-0000-0000-0000-000000000001', 'Bad Action', 'x')$s$, '23514', '작업 이름 형식(소문자·점·밑줄)을 지켜야 한다');

-- ───────── F-703 통계 · 번역 캐시 ─────────
INSERT INTO analytics_daily (day, metric, value) VALUES ('2026-10-30', 'signups_b2c', 12);
INSERT INTO analytics_daily (day, metric, sdg_id, value) VALUES ('2026-10-30', 'signups_b2c', 14, 5);
SELECT pg_temp.fails($s$INSERT INTO analytics_daily (day, metric, value) VALUES ('2026-10-30', 'signups_b2c', 13)$s$, '23505', '같은 날·같은 지표(SDG 없음)는 한 줄뿐이다');
SELECT pg_temp.fails($s$INSERT INTO analytics_daily (day, metric, sdg_id, value) VALUES ('2026-10-30', 'signups_b2c', 14, 6)$s$, '23505', '같은 날·같은 지표·같은 SDG 도 한 줄뿐이다');
SELECT pg_temp.fails($s$INSERT INTO analytics_daily (day, metric, value) VALUES ('2026-10-31', 'signups_b2c', -1)$s$, '23514', '통계 값은 음수가 될 수 없다');
INSERT INTO content_translations (entity, entity_id, field, locale, body) VALUES ('challenge', 'e0000000-0000-0000-0000-0000000000e1', 'title', 'ko', '번역된 제목');
SELECT pg_temp.fails($s$INSERT INTO content_translations (entity, entity_id, field, locale, body) VALUES ('challenge', 'e0000000-0000-0000-0000-0000000000e1', 'title', 'ko', '중복')$s$, '23505', '같은 글·같은 필드·같은 언어의 번역은 하나뿐이다');
SELECT pg_temp.fails($s$INSERT INTO content_translations (entity, entity_id, field, locale, body) VALUES ('invoice', gen_random_uuid(), 'title', 'ko', 'x')$s$, '23514', '번역 대상 종류는 정해진 것만 쓴다');

ROLLBACK;
\echo '05_scout_cert_admin: 통과'
