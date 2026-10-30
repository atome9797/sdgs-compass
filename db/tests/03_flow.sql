-- 제출·심사·수상·채용 매칭·기부(F-301~F-303)와 활동·Impact·디지털 증명서(F-401, F-402, F-502)의 규칙과 한 바퀴 흐름
\ir helpers.sql
BEGIN;
\ir fixtures.sql

SELECT pg_temp.mk_challenge('e0000000-0000-0000-0000-0000000000f1'::uuid);                       -- 모집 중, 심사위원 2명
SELECT pg_temp.mk_challenge('e0000000-0000-0000-0000-0000000000f2'::uuid, 'team', 3::smallint);  -- 팀 전용
SELECT pg_temp.mk_challenge('e0000000-0000-0000-0000-0000000000f3'::uuid, 'individual');         -- 개인 전용
SELECT pg_temp.mk_challenge('e0000000-0000-0000-0000-0000000000f4'::uuid, 'both', NULL, 'judging'); -- 심사 중

-- ───────── F-301 제출 ─────────
SELECT pg_temp.fails($s$
  INSERT INTO proposals (id, challenge_id, submitter_id, team_name, title, summary)
  VALUES ('f0000000-0000-0000-0000-00000000dead', 'e0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000001', 'A', 'B', 'C');
  SET CONSTRAINTS proposals_has_version IMMEDIATE
$s$, '23514', '파일(버전 1) 없이 제출 건만 만들 수 없다 (트랜잭션 끝에서 검사)');

SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000001');
SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000002');
SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000003');
SET CONSTRAINTS proposals_has_version IMMEDIATE;
SET CONSTRAINTS proposals_has_version DEFERRED;
SELECT pg_temp.ok(true, '제출 건 + 1번 버전을 같은 트랜잭션에 넣으면 통과한다');

SELECT pg_temp.eq((SELECT receipt_no FROM proposals WHERE id = 'f0000000-0000-0000-0000-000000000001'),
                  'SC-' || to_char(jst_date(now()), 'YYYYMMDD') || '-0001', '제출 수령증 번호가 SC-날짜-0001 로 자동 발급된다');
SELECT pg_temp.eq((SELECT receipt_no FROM proposals WHERE id = 'f0000000-0000-0000-0000-000000000003'),
                  'SC-' || to_char(jst_date(now()), 'YYYYMMDD') || '-0003', '같은 날 세 번째 제출은 -0003 이다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-0000000000a1', 'e0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000001')$s$,
                     '23505', '한 사람은 한 챌린지에 한 건만 제출한다 (다시 내려면 새 버전)');
SELECT pg_temp.fails($s$INSERT INTO proposals (challenge_id, submitter_id, team_name, title, summary, receipt_no)
                        VALUES ('e0000000-0000-0000-0000-0000000000f3', 'c0000000-0000-0000-0000-000000000001', 'A', 'B', 'C', 'SC-2026-1')$s$,
                     '23514', '수령증 번호 형식이 SC-YYYYMMDD-NNNN 이 아니면 거절한다');
SELECT pg_temp.fails($s$INSERT INTO proposals (challenge_id, submitter_id, team_name, title, summary)
                        VALUES ('e0000000-0000-0000-0000-0000000000f3', 'c0000000-0000-0000-0000-000000000001', 'A', repeat('あ', 61), 'C')$s$,
                     '23514', '제목은 60자까지 (LIMITS.title)');
SELECT pg_temp.fails($s$INSERT INTO proposals (challenge_id, submitter_id, team_name, title, summary)
                        VALUES ('e0000000-0000-0000-0000-0000000000f3', 'c0000000-0000-0000-0000-000000000001', 'A', 'B', repeat('あ', 301))$s$,
                     '23514', '요약은 300자까지 (LIMITS.summary)');
SELECT pg_temp.fails($s$INSERT INTO proposals (challenge_id, submitter_id, team_name, title, summary, video_url)
                        VALUES ('e0000000-0000-0000-0000-0000000000f3', 'c0000000-0000-0000-0000-000000000001', 'A', 'B', 'C', 'http://youtu.be/x')$s$,
                     '23514', '영상 URL 은 https 만 받는다');
SELECT pg_temp.fails($s$INSERT INTO proposals (challenge_id, submitter_id, team_name, title, summary)
                        VALUES ('e0000000-0000-0000-0000-0000000000f4', 'c0000000-0000-0000-0000-000000000001', 'A', 'B', 'C')$s$,
                     '23514', '심사 중인(마감된) 챌린지에는 새로 제출할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO proposals (challenge_id, submitter_id, team_name, title, summary)
                        VALUES ('e0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-000000000001', 'A', 'B', 'C')$s$,
                     '23514', '팀 전용 챌린지에는 개인으로 제출할 수 없다');
INSERT INTO teams (id, challenge_id, name, leader_id) VALUES
  ('33333333-0000-0000-0000-0000000000f2', 'e0000000-0000-0000-0000-0000000000f2', 'Team Wave', 'c0000000-0000-0000-0000-000000000001');
INSERT INTO team_members (team_id, challenge_id, user_id) VALUES
  ('33333333-0000-0000-0000-0000000000f2', 'e0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-0000000000f2', 'e0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-000000000002');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-0000000000b1', 'e0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-000000000004', '33333333-0000-0000-0000-0000000000f2')$s$,
                     '23514', '팀 구성원이 아니면 팀 이름으로 제출할 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-0000000000b2', 'e0000000-0000-0000-0000-0000000000f3', 'c0000000-0000-0000-0000-000000000001', '33333333-0000-0000-0000-0000000000f2')$s$,
                     '23514', '개인 전용 챌린지에는 팀으로 제출할 수 없다');
INSERT INTO team_members (team_id, challenge_id, user_id) VALUES ('33333333-0000-0000-0000-0000000000f2', 'e0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-000000000004');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-0000000000b5', 'e0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000004', '33333333-0000-0000-0000-0000000000f2')$s$,
                     '23503', '다른 챌린지의 팀 이름으로는 제출할 수 없다 (팀과 챌린지는 복합 FK 로 묶여 있다)');
SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-0000000000b3', 'e0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-000000000001', '33333333-0000-0000-0000-0000000000f2');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-0000000000b4', 'e0000000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-000000000002', '33333333-0000-0000-0000-0000000000f2')$s$,
                     '23505', '한 팀은 한 챌린지에 한 건만 제출한다');

-- ───────── F-302 버전 관리 ─────────
INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256, change_reason)
  VALUES ('f0000000-0000-0000-0000-000000000001', 'files/v2', 'plan_v2.pptx',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', 2048, repeat('b', 64), '図を追加');
SELECT pg_temp.eq((SELECT max(version_no) FROM proposal_versions WHERE proposal_id = 'f0000000-0000-0000-0000-000000000001'), 2::smallint, '다시 내면 버전 번호가 2 로 자동 증가한다');
SELECT pg_temp.eq((SELECT current_version || ':' || file_name FROM proposal_current WHERE id = 'f0000000-0000-0000-0000-000000000001'), '2:plan_v2.pptx', 'proposal_current 뷰는 가장 최신 버전을 보여 준다');
SELECT pg_temp.fails($s$INSERT INTO proposal_versions (proposal_id, version_no, file_key, file_name, mime_type, size_bytes, sha256)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 5, 'k', 'a.pdf', 'application/pdf', 10, repeat('c', 64))$s$,
                     '23514', '버전 번호를 건너뛸 수 없다');
SELECT pg_temp.fails($s$UPDATE proposal_versions SET size_bytes = 1 WHERE proposal_id = 'f0000000-0000-0000-0000-000000000001' AND version_no = 1$s$,
                     '23001', '한 번 기록한 버전은 고칠 수 없다');
SELECT pg_temp.fails($s$INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'k', 'a.docx', 'application/pdf', 10, repeat('c', 64))$s$,
                     '23514', 'PDF·PPTX 가 아닌 확장자는 거절한다');
SELECT pg_temp.fails($s$INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'k', 'a.pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 10, repeat('c', 64))$s$,
                     '23514', '확장자와 파일 형식(MIME)이 다르면 거절한다');
SELECT pg_temp.fails($s$INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'k', 'a.pdf', 'application/pdf', 52428801, repeat('c', 64))$s$,
                     '23514', '파일은 50MB 를 넘을 수 없다 (LIMITS.fileBytes)');
SELECT pg_temp.fails($s$INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'k', 'a.pdf', 'application/pdf', 52428800, repeat('C', 64))$s$,
                     '23514', '파일 지문(SHA-256)은 소문자 16진수 64자여야 한다');
INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256)
  VALUES ('f0000000-0000-0000-0000-000000000002', 'k', 'exactly50mb.pdf', 'application/pdf', 52428800, repeat('c', 64));
SELECT pg_temp.ok(true, '정확히 50MB(52,428,800 바이트)는 받아 준다');
SELECT pg_temp.fails($s$INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256, submitted_at)
                        VALUES ('f0000000-0000-0000-0000-000000000003', 'k', 'late.pdf', 'application/pdf', 10, repeat('c', 64), now() + interval '11 days')$s$,
                     '23514', '마감 뒤에는 새 버전을 낼 수 없다');
SELECT pg_temp.eq((SELECT applicants FROM challenge_stats WHERE challenge_id = 'e0000000-0000-0000-0000-0000000000f1')::int, 3, 'challenge_stats: 응모자 3명');

-- ───────── F-303 심사 ─────────
SELECT pg_temp.fails($s$INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000002', 5, 4, 3)$s$,
                     '23514', '모집 중(open)에는 점수를 줄 수 없다 — 심사 단계에서만');
UPDATE challenges SET status = 'judging' WHERE id = 'e0000000-0000-0000-0000-0000000000f1';
SELECT pg_temp.fails($s$SELECT pg_temp.mk_proposal('f0000000-0000-0000-0000-0000000000c1', 'e0000000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000004')$s$,
                     '23514', '심사 단계로 넘어간 뒤에는 새로 제출할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000001', 5, 4, 3)$s$,
                     '23503', '지정되지 않은 사람(기업 대표)은 점수를 줄 수 없다');
SELECT pg_temp.fails($s$INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000002', 6, 4, 3)$s$,
                     '23514', '점수는 1~5 점이다 (6점 거절)');
SELECT pg_temp.fails($s$INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000002', 5, 0, 3)$s$,
                     '23514', '점수는 1~5 점이다 (0점 거절)');
SELECT pg_temp.fails($s$INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f4', 'b0000000-0000-0000-0000-000000000002', 5, 4, 3)$s$,
                     '23503', '제출 건과 챌린지가 맞지 않는 심사는 거절한다 (복합 FK)');
INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution, comment)
  VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000002', 5, 4, 3, '実現性に課題');
SELECT pg_temp.eq((SELECT average FROM reviews WHERE proposal_id = 'f0000000-0000-0000-0000-000000000001'), 4.00::numeric(3,2), '평균 점수는 (5+4+3)/3 = 4.00');
SELECT pg_temp.eq((SELECT status FROM proposals WHERE id = 'f0000000-0000-0000-0000-000000000001')::text, 'reviewed', '첫 점수가 들어오면 제출 건이 reviewed 가 된다');
SELECT pg_temp.fails($s$INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000002', 1, 1, 1)$s$,
                     '23505', '한 심사위원이 같은 제출 건에 두 번 점수를 줄 수 없다');

-- 수상 확정은 심사위원 전원이 점수를 준 뒤에만 (F-303)
SELECT pg_temp.fails($s$INSERT INTO awards (proposal_id, challenge_id, kind, awarded_by)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'grand', 'a0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '심사위원 2명 중 1명만 점수를 줬으면 수상을 확정할 수 없다');
INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000003', 4, 4, 4),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000002', 3, 3, 4),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-000000000003', 3, 4, 4);
INSERT INTO awards (id, proposal_id, challenge_id, kind, awarded_by)
  VALUES ('aa000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'grand', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT points FROM awards WHERE id = 'aa000000-0000-0000-0000-000000000001'), 400::smallint, '대상(grand)은 400 포인트');
SELECT pg_temp.eq((SELECT status FROM proposals WHERE id = 'f0000000-0000-0000-0000-000000000001')::text, 'awarded', '수상이 확정되면 제출 건이 awarded 가 된다');
SELECT pg_temp.fails($s$INSERT INTO awards (proposal_id, challenge_id, kind, awarded_by)
                        VALUES ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-0000000000f1', 'grand', 'a0000000-0000-0000-0000-000000000001')$s$,
                     '23505', '한 챌린지에 대상(grand)은 한 건뿐이다');
SELECT pg_temp.fails($s$INSERT INTO awards (proposal_id, challenge_id, kind, awarded_by)
                        VALUES ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'special', 'a0000000-0000-0000-0000-000000000001')$s$,
                     '23505', '한 제출 건에 수상은 한 번뿐이다');
INSERT INTO awards (id, proposal_id, challenge_id, kind, awarded_by)
  VALUES ('aa000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-0000000000f1', 'excellence', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT points FROM awards WHERE id = 'aa000000-0000-0000-0000-000000000002'), 300::smallint, '우수상(excellence)은 300 포인트');

-- ───────── 채용 매칭 · 수수료 · 기부 ─────────
SELECT pg_temp.fails($s$INSERT INTO matches (challenge_id, company_id, proposal_id, adopted_by)
                        VALUES ('e0000000-0000-0000-0000-0000000000f1', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '심사를 마치지 않은 제안은 채용할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO matches (challenge_id, company_id, proposal_id, adopted_by)
                        VALUES ('e0000000-0000-0000-0000-0000000000f1', 'd0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009')$s$,
                     '23503', '다른 기업의 챌린지 제안을 채용할 수 없다');
INSERT INTO matches (id, challenge_id, company_id, proposal_id, adopted_by)
  VALUES ('bb000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000f1', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT fee_yen || '/' || donation_yen || '/' || revenue_yen FROM matches WHERE id = 'bb000000-0000-0000-0000-000000000001'), '30000/15000/15000', '중개 수수료 ¥30,000 = 기부 ¥15,000 + 운영 수익 ¥15,000');
SELECT pg_temp.eq((SELECT status FROM proposals WHERE id = 'f0000000-0000-0000-0000-000000000001')::text, 'adopted', '채용하면 제출 건이 adopted 가 된다');
SELECT pg_temp.fails($s$INSERT INTO matches (challenge_id, company_id, proposal_id, adopted_by)
                        VALUES ('e0000000-0000-0000-0000-0000000000f1', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '이미 채용된 제안을 다시 채용할 수 없다');
SELECT pg_temp.fails($s$UPDATE proposals SET status = 'submitted' WHERE id = 'f0000000-0000-0000-0000-000000000001'$s$, '23514', '채용된 제안을 되돌릴 수 없다');
SELECT pg_temp.eq((SELECT match_count || ':' || fee_yen || ':' || donation_yen || ':' || revenue_yen FROM company_fee_summary WHERE company_id = 'd0000000-0000-0000-0000-000000000001'),
                  '1:30000:15000:15000', 'company_fee_summary: 1건 · 수수료 30,000 · 기부 15,000 · 수익 15,000');

INSERT INTO donation_recipients (id, name_ja, name_ko, sdg_id) VALUES ('cc000000-0000-0000-0000-000000000001', '海洋保全NPO', '해양보전 NPO', 14);
SELECT pg_temp.fails($s$INSERT INTO donations (match_id, amount_yen, recipient_id) VALUES ('bb000000-0000-0000-0000-000000000001', 14999, 'cc000000-0000-0000-0000-000000000001')$s$,
                     '23503', '기부 금액은 매칭의 기부액(¥15,000)과 달라서는 안 된다');
INSERT INTO donations (match_id, amount_yen, recipient_id) VALUES ('bb000000-0000-0000-0000-000000000001', 15000, 'cc000000-0000-0000-0000-000000000001');
SELECT pg_temp.fails($s$INSERT INTO donations (match_id, amount_yen, recipient_id) VALUES ('bb000000-0000-0000-0000-000000000001', 15000, 'cc000000-0000-0000-0000-000000000001')$s$,
                     '23505', '한 매칭의 기부는 한 번만 기록한다');

-- ───────── F-401 활동 · Impact Index ─────────
INSERT INTO share_cards (id, user_id, award_id, template, headline) VALUES
  ('dd000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'instagram', '大賞を受賞しました！');
SELECT pg_temp.fails($s$INSERT INTO activities (user_id, kind, challenge_id, title, company_name, points, occurred_on)
                        VALUES ('c0000000-0000-0000-0000-000000000001', 'participation', 'e0000000-0000-0000-0000-0000000000f1', 't', 'c', 60, current_date)$s$,
                     '23514', '참가 활동은 정확히 50 포인트다 (PARTICIPATION_POINTS)');
SELECT pg_temp.fails($s$INSERT INTO activities (user_id, kind, title, company_name, points, occurred_on)
                        VALUES ('c0000000-0000-0000-0000-000000000001', 'submission', 't', 'c', 100, current_date)$s$,
                     '23514', '제출 활동에는 제출 건이 있어야 한다');
SELECT pg_temp.fails($s$INSERT INTO activities (user_id, kind, award_id, title, company_name, points, occurred_on)
                        VALUES ('c0000000-0000-0000-0000-000000000001', 'award', 'aa000000-0000-0000-0000-000000000001', 't', 'c', 300, current_date)$s$,
                     '23503', '수상 활동의 포인트는 수상 종류의 포인트(대상 400)와 같아야 한다');

INSERT INTO activities (id, user_id, kind, challenge_id, title, company_name, points, occurred_on) VALUES
  ('ac000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'participation', 'e0000000-0000-0000-0000-0000000000f1', '海洋プラ', 'みなと海洋フーズ', 50, current_date);
INSERT INTO activities (id, user_id, kind, award_id, title, company_name, points, occurred_on) VALUES
  ('ac000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'award', 'aa000000-0000-0000-0000-000000000001', '海洋プラ', 'みなと海洋フーズ', 400, current_date);
INSERT INTO activity_sdgs VALUES ('ac000000-0000-0000-0000-000000000001', 14), ('ac000000-0000-0000-0000-000000000001', 12), ('ac000000-0000-0000-0000-000000000002', 14);
SELECT pg_temp.eq((SELECT raw_points FROM impact_scores WHERE user_id = 'c0000000-0000-0000-0000-000000000001' AND sdg_id = 14), 450, 'SDG 14 의 누적 포인트: 참가 50 + 대상 400');
SELECT pg_temp.eq((SELECT score FROM impact_scores WHERE user_id = 'c0000000-0000-0000-0000-000000000001' AND sdg_id = 14), 78::smallint, 'SDG 14 점수: 100×(1−e^(−450/300)) ≈ 78');
SELECT pg_temp.eq((SELECT score FROM impact_scores WHERE user_id = 'c0000000-0000-0000-0000-000000000001' AND sdg_id = 12), 15::smallint, 'SDG 12 점수: 100×(1−e^(−50/300)) ≈ 15');

-- 공유 포인트는 최대 5번까지 (MAX_SHARE_ACTIVITIES), 그 뒤는 0점
INSERT INTO share_cards (id, user_id, template, headline)
  SELECT ('dd000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid, 'c0000000-0000-0000-0000-000000000001', 'linkedin', '共有 ' || n FROM generate_series(1, 7) n;
INSERT INTO activities (user_id, kind, share_card_id, title, company_name, points, occurred_on)
  SELECT 'c0000000-0000-0000-0000-000000000001', 'share', ('dd000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid, '共有', '-', 999, current_date
    FROM generate_series(1, 7) n;
SELECT pg_temp.eq((SELECT count(*) FILTER (WHERE points = 10) || '+' || count(*) FILTER (WHERE points = 0) FROM activities WHERE kind = 'share'), '5+2', '공유 7번 중 앞의 5번만 10 포인트, 나머지는 0 포인트');
SELECT pg_temp.eq((SELECT total_points || ' Lv.' || level FROM impact_totals WHERE user_id = 'c0000000-0000-0000-0000-000000000001'), '500 Lv.2', 'impact_totals: 50 + 400 + 50 = 500 pt → Lv.2');
SELECT pg_temp.eq((SELECT total_points || ' Lv.' || level FROM impact_totals WHERE user_id = 'c0000000-0000-0000-0000-000000000002'), '0 Lv.1', '활동이 없는 학생도 0 pt · Lv.1 로 보인다');
SELECT pg_temp.fails($s$UPDATE activities SET points = 1 WHERE id = 'ac000000-0000-0000-0000-000000000001'$s$, '23001', '활동 기록은 고칠 수 없다');
INSERT INTO user_badges (user_id, badge_code) VALUES ('c0000000-0000-0000-0000-000000000001', 'winner');
SELECT pg_temp.fails($s$INSERT INTO user_badges (user_id, badge_code) VALUES ('c0000000-0000-0000-0000-000000000001', 'winner')$s$, '23505', '같은 배지를 두 번 받지 않는다');
SELECT pg_temp.fails($s$INSERT INTO user_badges (user_id, badge_code) VALUES ('c0000000-0000-0000-0000-000000000001', 'unknown')$s$, '23503', '정의되지 않은 배지는 거절한다');
SELECT pg_temp.fails($s$INSERT INTO portfolio_files (user_id, kind, title) VALUES ('c0000000-0000-0000-0000-000000000001', 'pdf', 'x')$s$, '23514', 'PDF 포트폴리오에는 파일이 있어야 한다');
INSERT INTO portfolio_files (user_id, kind, title, url) VALUES ('c0000000-0000-0000-0000-000000000001', 'url', 'Notion', 'https://example.com/me');

-- ───────── F-502 디지털 증명서 ─────────
INSERT INTO certificates (serial_no, user_id, activity_id, kind, holder_name, challenge_title, company_name, award_kind, sdg_ids, points, issued_on, content_hash)
  VALUES ('SC-C-0001', 'c0000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000002', 'award', 'Mina', '海洋プラ', 'みなと海洋フーズ', 'grand', ARRAY[14]::smallint[], 400, DATE '2026-10-30',
          certificate_hash(certificate_payload('SC-C-0001', 'award', 'Mina', '海洋プラ', 'みなと海洋フーズ', 'grand', ARRAY[14]::smallint[], 400, DATE '2026-10-30')));
SELECT pg_temp.fails($s$INSERT INTO certificates (serial_no, user_id, kind, holder_name, challenge_title, company_name, award_kind, sdg_ids, points, issued_on, content_hash)
                        VALUES ('SC-C-0002', 'c0000000-0000-0000-0000-000000000001', 'award', 'Mina', 't', 'c', 'grand', ARRAY[14]::smallint[], 400, DATE '2026-10-30', repeat('0', 64))$s$,
                     '23514', '내용과 맞지 않는 해시로는 증명서를 발급할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO certificates (serial_no, user_id, kind, holder_name, challenge_title, company_name, sdg_ids, points, issued_on, content_hash)
                        VALUES ('SC-C-0003', 'c0000000-0000-0000-0000-000000000001', 'award', 'Mina', 't', 'c', ARRAY[14]::smallint[], 400, DATE '2026-10-30', repeat('0', 64))$s$,
                     '23514', '수상 증명서에는 수상 종류가 있어야 한다');
SELECT pg_temp.fails($s$INSERT INTO certificates (serial_no, user_id, activity_id, kind, holder_name, challenge_title, company_name, award_kind, sdg_ids, points, issued_on, content_hash)
                        VALUES ('SC-C-0004', 'c0000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000002', 'award', 'Mina', '海洋プラ', 'みなと海洋フーズ', 'grand', ARRAY[14]::smallint[], 400, DATE '2026-10-30',
                                certificate_hash(certificate_payload('SC-C-0004', 'award', 'Mina', '海洋プラ', 'みなと海洋フーズ', 'grand', ARRAY[14]::smallint[], 400, DATE '2026-10-30')))$s$,
                     '23505', '한 활동에 증명서는 한 장뿐이다');
SELECT pg_temp.eq((SELECT verify_code FROM certificates WHERE serial_no = 'SC-C-0001'), upper(substr(content_hash, 1, 4) || '-' || substr(content_hash, 5, 4) || '-' || substr(content_hash, 9, 4)), '확인 코드는 해시 앞 12자리를 4자리씩 끊은 것이다')
  FROM certificates WHERE serial_no = 'SC-C-0001';
CREATE TEMP TABLE qr AS SELECT qr_payload, split_part(qr_payload, '|', 2) AS serial, split_part(qr_payload, '|', 3) AS prefix FROM certificates WHERE serial_no = 'SC-C-0001';
SELECT pg_temp.eq(verify_certificate(serial, prefix)::text, 'valid', 'QR 로 확인하면 정상(valid)이다') FROM qr;
SELECT pg_temp.eq(verify_certificate(serial, repeat('0', 32))::text, 'tampered', 'QR 의 해시가 다르면 위조(tampered)로 본다') FROM qr;
SELECT pg_temp.eq(verify_certificate('SC-C-9999', repeat('0', 32))::text, 'unknown', '없는 증명서 번호는 unknown');
SELECT pg_temp.fails($s$UPDATE certificates SET points = 999 WHERE serial_no = 'SC-C-0001'$s$, '23001', '발급된 증명서의 내용은 고칠 수 없다');
SELECT pg_temp.fails($s$UPDATE certificates SET revoked_at = now() WHERE serial_no = 'SC-C-0001'$s$, '23514', '폐기에는 사유가 있어야 한다');
-- 트리거를 우회해서(관리자 권한으로) 내용을 바꿨다고 가정 → 다시 계산한 해시와 달라서 tampered
ALTER TABLE certificates DISABLE TRIGGER certificates_guard_upd;
UPDATE certificates SET points = 999 WHERE serial_no = 'SC-C-0001';
SELECT pg_temp.eq(verify_certificate(serial, prefix)::text, 'tampered', '내용이 몰래 바뀌면 해시가 달라져 tampered 로 드러난다') FROM qr;
UPDATE certificates SET points = 400 WHERE serial_no = 'SC-C-0001';
ALTER TABLE certificates ENABLE TRIGGER certificates_guard_upd;
UPDATE certificates SET revoked_at = now(), revoked_reason = '本人の申請により取り消し' WHERE serial_no = 'SC-C-0001';
SELECT pg_temp.eq(verify_certificate(serial, prefix)::text, 'revoked', '폐기한 증명서는 revoked 로 보인다') FROM qr;
UPDATE certificates SET chain_tx = '0xabc' WHERE serial_no = 'SC-C-0001';
SELECT pg_temp.ok(true, '블록체인 기록(chain_tx)은 발급 뒤에도 채울 수 있다 (Phase 2)');
INSERT INTO certificate_verifications (serial_no, certificate_id, result, verifier_company_id)
  SELECT 'SC-C-0001', id, 'revoked', 'd0000000-0000-0000-0000-000000000001' FROM certificates WHERE serial_no = 'SC-C-0001';
SELECT pg_temp.fails($s$UPDATE certificate_verifications SET result = 'valid'$s$, '23001', '확인 기록은 고칠 수 없다');

-- ───────── F-501 카드뉴스 ─────────
SELECT pg_temp.fails($s$INSERT INTO share_cards (user_id, template, headline) VALUES ('c0000000-0000-0000-0000-000000000001', 'tiktok', 'x')$s$, '22P02', '지원하지 않는 카드 규격(Instagram·LinkedIn 외)은 거절한다');
SELECT pg_temp.fails($s$INSERT INTO share_cards (user_id, template, headline) VALUES ('c0000000-0000-0000-0000-000000000001', 'instagram', '   ')$s$, '23514', '빈 제목의 카드뉴스는 만들 수 없다');

ROLLBACK;
\echo '03_flow: 통과'
