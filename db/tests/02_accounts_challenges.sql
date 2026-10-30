-- 계정·프로필·기업(F-101~F-104, F-701)과 챌린지·팀 빌딩·알림(F-201~F-204)의 규칙
\ir helpers.sql
BEGIN;
\ir fixtures.sql

-- ───────── F-101 계정 ─────────
SELECT pg_temp.fails($s$INSERT INTO users (email, role) VALUES ('MINA@Example.com', 'b2c')$s$, '23505', '이메일은 대소문자를 구분하지 않고 중복될 수 없다');
SELECT pg_temp.fails($s$INSERT INTO users (email, role) VALUES ('not-an-email', 'b2c')$s$, '23514', '이메일 형식이 아니면 거절한다');
SELECT pg_temp.ok((SELECT count(*) FROM users WHERE lower(email) = 'mina@example.com') = 1, '같은 이메일은 한 계정뿐이다');
UPDATE users SET deleted_at = now() WHERE email = 'mina@example.com';
INSERT INTO users (email, role) VALUES ('mina@example.com', 'b2c');
SELECT pg_temp.ok(true, '탈퇴한 계정의 이메일은 다시 가입할 수 있다');

INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ('c0000000-0000-0000-0000-000000000002', 'google', 'g-123');
SELECT pg_temp.fails($s$INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ('c0000000-0000-0000-0000-000000000003', 'google', 'g-123')$s$,
                     '23505', '같은 소셜 계정을 두 사용자가 쓸 수 없다');
SELECT pg_temp.fails($s$INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ('c0000000-0000-0000-0000-000000000003', 'facebook', 'x')$s$,
                     '22P02', '지원하지 않는 소셜 로그인(Google/Kakao/Apple 외)은 거절한다');

-- ───────── F-102 프로필: 관심 SDGs 는 최대 5개, 우선순위는 겹치지 않는다 ─────────
INSERT INTO profile_sdg_interests (user_id, sdg_id, priority) VALUES
  ('c0000000-0000-0000-0000-000000000001', 14, 1), ('c0000000-0000-0000-0000-000000000001', 12, 2),
  ('c0000000-0000-0000-0000-000000000001', 13, 3), ('c0000000-0000-0000-0000-000000000001', 7, 4),
  ('c0000000-0000-0000-0000-000000000001', 4, 5);
SELECT pg_temp.fails($s$INSERT INTO profile_sdg_interests VALUES ('c0000000-0000-0000-0000-000000000001', 1, 6)$s$, '23514', '관심 SDGs 6번째(우선순위 6)는 거절한다');
SELECT pg_temp.fails($s$INSERT INTO profile_sdg_interests VALUES ('c0000000-0000-0000-0000-000000000001', 1, 3)$s$, '23505', '우선순위가 겹치면 거절한다');
SELECT pg_temp.fails($s$INSERT INTO profile_sdg_interests VALUES ('c0000000-0000-0000-0000-000000000001', 14, 5)$s$, '23505', '같은 SDG 를 두 번 고를 수 없다');
SELECT pg_temp.fails($s$INSERT INTO profile_sdg_interests VALUES ('c0000000-0000-0000-0000-000000000002', 18, 1)$s$, '23503', '1~17 밖의 SDG 는 거절한다');
SELECT pg_temp.fails($s$INSERT INTO profile_skills VALUES ('c0000000-0000-0000-0000-000000000001', 'cooking')$s$, '23503', '목록에 없는 스킬 태그는 거절한다');

-- ───────── F-103/F-701 기업 ─────────
SELECT pg_temp.fails($s$INSERT INTO companies (owner_id, name, business_number) VALUES ('b0000000-0000-0000-0000-000000000009', 'X', 'abc')$s$, '23514', '사업자번호 형식이 아니면 거절한다');
SELECT pg_temp.fails($s$INSERT INTO companies (owner_id, name, business_number) VALUES ('b0000000-0000-0000-0000-000000000009', 'X', '1234567890123')$s$, '23505', '같은 사업자번호로 두 번 등록할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO companies (owner_id, name, status) VALUES ('b0000000-0000-0000-0000-000000000009', 'X', 'approved')$s$, '23514', '승인 일시 없이 "승인됨" 상태가 될 수 없다');

-- ───────── F-201 챌린지 출제 ─────────
SELECT pg_temp.fails($s$INSERT INTO challenges (company_id, created_by, title, summary, created_at, closes_at)
                        VALUES ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 't', 's', now(), now() + interval '30 days')$s$,
                     '23514', '승인 전 기업은 챌린지를 만들 수 없다 (F-103)');
SELECT pg_temp.fails($s$INSERT INTO challenges (company_id, created_by, title, summary, created_at, closes_at)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 't', 's', now(), now() + interval '6 days')$s$,
                     '23514', '마감이 만든 날부터 7일 미만이면 거절한다 (F-201)');
SELECT pg_temp.fails($s$INSERT INTO challenges (company_id, created_by, title, summary, created_at, closes_at)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 't', 's', now(), now() + interval '91 days')$s$,
                     '23514', '마감이 90일을 넘으면 거절한다');
INSERT INTO challenges (id, company_id, created_by, title, summary, created_at, closes_at) VALUES
  ('e0000000-0000-0000-0000-0000000000a7', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ちょうど7日', 's', now(), now() + interval '7 days'),
  ('e0000000-0000-0000-0000-0000000000a9', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ちょうど90日', 's', now(), now() + interval '90 days');
SELECT pg_temp.ok(true, '마감이 정확히 7일·90일이면 받아 준다');
SELECT pg_temp.fails($s$INSERT INTO challenges (company_id, created_by, title, summary, status, approved_by, approved_at, created_at, closes_at)
                        VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 't', 's', 'open',
                                'a0000000-0000-0000-0000-000000000001', now(), now(), now() + interval '30 days')$s$,
                     '23514', '새 챌린지를 곧바로 공개(open) 상태로 만들 수 없다');
SELECT pg_temp.fails($s$UPDATE challenges SET status = 'open' WHERE id = 'e0000000-0000-0000-0000-0000000000a7'$s$, '23514', '관리자 승인 정보 없이 공개할 수 없다 (F-701)');
SELECT pg_temp.fails($s$UPDATE challenges SET status = 'pending_review' WHERE id = 'e0000000-0000-0000-0000-0000000000a7'$s$, '23514', '목표 SDGs 없이 심사를 요청할 수 없다');

-- 목표 SDGs 는 최대 3개
INSERT INTO challenge_sdgs VALUES ('e0000000-0000-0000-0000-0000000000a7', 1, 14), ('e0000000-0000-0000-0000-0000000000a7', 2, 12), ('e0000000-0000-0000-0000-0000000000a7', 3, 13);
SELECT pg_temp.fails($s$INSERT INTO challenge_sdgs VALUES ('e0000000-0000-0000-0000-0000000000a7', 4, 7)$s$, '23514', '목표 SDGs 는 3개를 넘을 수 없다 (MAX_CHALLENGE_SDGS)');
SELECT pg_temp.fails($s$INSERT INTO challenge_sdgs VALUES ('e0000000-0000-0000-0000-0000000000a7', 1, 7)$s$, '23505', '같은 자리에 두 개를 넣을 수 없다');
SELECT pg_temp.fails($s$INSERT INTO challenge_sdgs VALUES ('e0000000-0000-0000-0000-0000000000a9', 1, 14), ('e0000000-0000-0000-0000-0000000000a9', 2, 14)$s$, '23505', '같은 SDG 를 두 번 넣을 수 없다');

-- 상태 전이
UPDATE challenges SET status = 'pending_review' WHERE id = 'e0000000-0000-0000-0000-0000000000a7';
UPDATE challenges SET status = 'draft' WHERE id = 'e0000000-0000-0000-0000-0000000000a7';
UPDATE challenges SET status = 'pending_review' WHERE id = 'e0000000-0000-0000-0000-0000000000a7';
SELECT pg_temp.ok(true, '초안 → 심사 요청 → 반려(초안) → 다시 심사 요청이 된다');
UPDATE challenges SET status = 'open', approved_by = 'a0000000-0000-0000-0000-000000000001', approved_at = now() WHERE id = 'e0000000-0000-0000-0000-0000000000a7';
SELECT pg_temp.fails($s$UPDATE challenges SET status = 'closed' WHERE id = 'e0000000-0000-0000-0000-0000000000a7'$s$, '23514', 'open → closed 로 심사 단계를 건너뛸 수 없다');
SELECT pg_temp.fails($s$UPDATE challenges SET status = 'judging' WHERE id = 'e0000000-0000-0000-0000-0000000000a7'$s$, '23514', '심사위원이 없으면 심사 단계로 넘어갈 수 없다 (F-303)');
SELECT pg_temp.fails($s$UPDATE challenges SET status = 'draft' WHERE id = 'e0000000-0000-0000-0000-0000000000a7'$s$, '23514', '공개된 챌린지를 초안으로 되돌릴 수 없다');

-- 보상·첨부·심사위원
SELECT pg_temp.fails($s$INSERT INTO challenge_rewards (challenge_id, kind) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'prize')$s$, '23514', '상금 보상에는 금액이 있어야 한다');
SELECT pg_temp.fails($s$INSERT INTO challenge_rewards (challenge_id, kind, amount_yen) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'internship', 1000)$s$, '23514', '인턴십 보상에는 금액을 둘 수 없다');
INSERT INTO challenge_rewards (challenge_id, kind, amount_yen) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'prize', 100000), ('e0000000-0000-0000-0000-0000000000a7', 'internship', NULL);
SELECT pg_temp.fails($s$INSERT INTO challenge_attachments (challenge_id, file_key, file_name, size_bytes) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'k', 'f.pdf', 52428801)$s$, '23514', '첨부 파일은 50MB 를 넘을 수 없다');
SELECT pg_temp.fails($s$INSERT INTO challenge_judges (challenge_id, company_id, user_id) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')$s$,
                     '23503', '기업 구성원이 아닌 사람은 심사위원이 될 수 없다');
SELECT pg_temp.fails($s$INSERT INTO challenge_judges (challenge_id, company_id, user_id) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009')$s$,
                     '23503', '다른 기업의 구성원은 이 챌린지의 심사위원이 될 수 없다');

-- ───────── F-203 Q&A · 팀 빌딩 ─────────
INSERT INTO challenge_comments (id, challenge_id, author_id, kind, body) VALUES
  ('11111111-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000a7', 'c0000000-0000-0000-0000-000000000001', 'question', '提出は何件までですか？');
INSERT INTO challenge_comments (challenge_id, parent_id, author_id, kind, body) VALUES
  ('e0000000-0000-0000-0000-0000000000a7', '11111111-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'answer', '1チーム1件です。');
SELECT pg_temp.fails($s$INSERT INTO challenge_comments (challenge_id, author_id, kind, body) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'b0000000-0000-0000-0000-000000000001', 'answer', '親なし')$s$,
                     '23514', '답변은 질문에 붙어야 한다');
SELECT pg_temp.fails($s$INSERT INTO challenge_comments (challenge_id, parent_id, author_id, kind, body) VALUES ('e0000000-0000-0000-0000-0000000000a9', '11111111-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'answer', '다른 챌린지의 질문')$s$,
                     '23503', '다른 챌린지의 질문에 답변을 달 수 없다');
SELECT pg_temp.fails($s$INSERT INTO challenge_comments (challenge_id, author_id, kind, body) VALUES ('e0000000-0000-0000-0000-0000000000a7', 'c0000000-0000-0000-0000-000000000001', 'question', '   ')$s$,
                     '23514', '공백만 있는 질문은 거절한다');

INSERT INTO team_posts (id, challenge_id, author_id, title, body) VALUES
  ('22222222-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000a7', 'c0000000-0000-0000-0000-000000000001', 'デザイナー募集', '一緒に包装案を考えませんか');
INSERT INTO team_post_roles VALUES ('22222222-0000-0000-0000-000000000001', 'design'), ('22222222-0000-0000-0000-000000000001', 'video');
INSERT INTO team_requests (post_id, requester_id) VALUES ('22222222-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');
SELECT pg_temp.fails($s$INSERT INTO team_requests (post_id, requester_id) VALUES ('22222222-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002')$s$, '23505', '같은 글에 참여 요청을 두 번 보낼 수 없다');
SELECT pg_temp.fails($s$INSERT INTO team_requests (post_id, requester_id) VALUES ('22222222-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')$s$, '23514', '자기 글에는 참여 요청을 보낼 수 없다');
SELECT pg_temp.fails($s$INSERT INTO team_requests (post_id, requester_id, status) VALUES ('22222222-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'accepted')$s$, '23514', '수락된 요청에는 결정 시각이 있어야 한다');

-- 팀: 한 챌린지에 한 팀, 최대 인원, 개인 전용 챌린지에는 팀 없음
SELECT pg_temp.mk_challenge('e0000000-0000-0000-0000-000000000001'::uuid, 'team', 2::smallint);
SELECT pg_temp.mk_challenge('e0000000-0000-0000-0000-000000000002'::uuid, 'team', 2::smallint);
SELECT pg_temp.mk_challenge('e0000000-0000-0000-0000-000000000003'::uuid, 'individual');
INSERT INTO teams (id, challenge_id, name, leader_id) VALUES
  ('33333333-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Team Wave', 'c0000000-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Team Reef', 'c0000000-0000-0000-0000-000000000004'),
  ('33333333-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'Solo?', 'c0000000-0000-0000-0000-000000000001');
INSERT INTO team_members (team_id, challenge_id, user_id) VALUES
  ('33333333-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');
SELECT pg_temp.fails($s$INSERT INTO team_members (team_id, challenge_id, user_id) VALUES ('33333333-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003')$s$,
                     '23514', '팀 인원이 챌린지가 정한 최대 인원(2명)을 넘을 수 없다');
SELECT pg_temp.fails($s$INSERT INTO team_members (team_id, challenge_id, user_id) VALUES ('33333333-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002')$s$,
                     '23505', '한 사람이 한 챌린지에서 두 팀에 들어갈 수 없다');
SELECT pg_temp.fails($s$INSERT INTO team_members (team_id, challenge_id, user_id) VALUES ('33333333-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004')$s$,
                     '23503', '팀과 챌린지가 맞지 않는 구성원 등록은 거절한다');
SELECT pg_temp.fails($s$INSERT INTO team_members (team_id, challenge_id, user_id) VALUES ('33333333-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '개인 전용 챌린지에는 팀을 만들 수 없다');

-- ───────── F-204 북마크 · 알림 ─────────
INSERT INTO bookmarks (user_id, challenge_id) VALUES ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001');
SELECT pg_temp.fails($s$INSERT INTO bookmarks (user_id, challenge_id) VALUES ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001')$s$, '23505', '같은 챌린지를 두 번 북마크할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO notifications (user_id, kind, title) VALUES ('c0000000-0000-0000-0000-000000000001', 'deadline_d3', '마감 3일 전')$s$, '23514', '마감 알림에는 챌린지가 있어야 한다');
INSERT INTO notifications (user_id, kind, channel, challenge_id, title) VALUES ('c0000000-0000-0000-0000-000000000001', 'deadline_d3', 'push', 'e0000000-0000-0000-0000-000000000001', '마감 3일 전');
SELECT pg_temp.fails($s$INSERT INTO notifications (user_id, kind, channel, challenge_id, title) VALUES ('c0000000-0000-0000-0000-000000000001', 'deadline_d3', 'push', 'e0000000-0000-0000-0000-000000000001', '중복')$s$, '23505', '같은 마감 알림(D-3)을 같은 채널로 두 번 만들지 않는다');
INSERT INTO notifications (user_id, kind, channel, challenge_id, title) VALUES ('c0000000-0000-0000-0000-000000000001', 'deadline_d3', 'kakao', 'e0000000-0000-0000-0000-000000000001', '채널이 다르면 가능');
SELECT pg_temp.ok(true, '채널이 다르면 같은 마감 알림을 따로 보낼 수 있다');
INSERT INTO notification_prefs (user_id, kind, channel, enabled) VALUES ('c0000000-0000-0000-0000-000000000001', 'deadline_d1', 'push', false);
SELECT pg_temp.fails($s$INSERT INTO device_tokens (user_id, platform, token) VALUES ('c0000000-0000-0000-0000-000000000001', 'windows', 't')$s$, '23514', '지원하지 않는 기기 종류는 거절한다');

ROLLBACK;
\echo '02_accounts_challenges: 통과'
