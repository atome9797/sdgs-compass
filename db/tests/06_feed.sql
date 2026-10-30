-- SNS 피드(F-503 학생 자랑 글 · F-504 기업 홍보 글)의 규칙: 글자 수·연락처·실적/기업 소속·태그·좋아요·공식 SNS 게시 날짜·피드 뷰
-- 앱(packages/core/src/post.ts)과 같은 값인지는 04_parity.sql 이 따로 맞춰 봐요. 여기서는 DB 가 규칙을 어기는 입력을 실제로 막는지 확인해요.
\ir helpers.sql
BEGIN;
\ir fixtures.sql
\ir feed_fixtures.sql

-- ───────── 시험용 세계 ─────────
-- 학생 Mina(c..01) Rin(c..02) Kai(c..03) Ren(c..04) · 승인된 기업 みなと海洋フーズ(d..01: 대표 b..01, 심사위원 b..02·b..03)
-- 승인 대기 기업(d..02: 대표 b..09) · 여기에 승인된 두 번째 기업 まちづくりラボ(d..03: 담당자 b..0a) — 공용 세계는 feed_world.sql:
-- Mina 의 참가 실적(SDGs 14·12·13·11) · Rin 의 참가 실적(SDG 7) · Mina 의 카드뉴스 공유 기록 · 챌린지 e1..01(d..01) · e1..c3(d..03)
\ir feed_world.sql

-- 이 시험에만 필요한 것: 수상까지 가는 챌린지(e1..02), 지워 볼 초안 챌린지(e1..03), Kai 의 제출 활동, Ren 의 수상 활동(우수상 300 pt)
SELECT pg_temp.mk_challenge('e1000000-0000-0000-0000-000000000002'::uuid);                          -- 모집 중 → 심사 → 수상 (수상 활동용)
SELECT pg_temp.mk_challenge('e1000000-0000-0000-0000-000000000003'::uuid, 'both', NULL, 'draft');  -- 지워 볼 초안 챌린지

SELECT pg_temp.mk_proposal('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003');
INSERT INTO activities (id, user_id, kind, proposal_id, title, company_name, points, occurred_on)
  VALUES ('ac100000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'submission', 'f1000000-0000-0000-0000-000000000001', '提出', 'みなと海洋フーズ', 100, current_date);
INSERT INTO activity_sdgs VALUES ('ac100000-0000-0000-0000-000000000003', 14);

SELECT pg_temp.mk_proposal('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004');
UPDATE challenges SET status = 'judging' WHERE id = 'e1000000-0000-0000-0000-000000000002';
INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution) VALUES
  ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 5, 4, 4),
  ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 4, 4, 5);
INSERT INTO awards (id, proposal_id, challenge_id, kind, awarded_by)
  VALUES ('aa100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'excellence', 'a0000000-0000-0000-0000-000000000001');
INSERT INTO activities (id, user_id, kind, award_id, title, company_name, points, occurred_on)
  VALUES ('ac100000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'award', 'aa100000-0000-0000-0000-000000000001', '受賞', 'みなと海洋フーズ', 300, current_date);
INSERT INTO activity_sdgs VALUES ('ac100000-0000-0000-0000-000000000004', 14), ('ac100000-0000-0000-0000-000000000004', 11);

-- ───────── 글자 수 (앞뒤 공백은 빼고, 이모지·한자도 1글자) ─────────
SELECT pg_temp.eq(post_char_count('  あ  '), 1, '앞뒤 공백은 글자 수에 넣지 않는다');
SELECT pg_temp.eq(post_char_count(chr(12288) || '題' || chr(12288)), 1, '전각 공백(U+3000)도 앞뒤에서는 잘린다');
SELECT pg_temp.eq(post_char_count(chr(12288) || chr(160) || E'\t\n'), 0, '공백뿐인 글은 0글자다');
SELECT pg_temp.eq(post_char_count('🏆🏆'), 2, '이모지는 1글자씩 센다 (코드포인트)');
SELECT pg_temp.eq(post_char_count('あ  い'), 4, '글 가운데의 공백은 센다');

-- ───────── 자랑 글 (F-503) ─────────
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(true, '내 실적(참가)을 붙인 자랑 글을 올릴 수 있다');
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'ac100000-0000-0000-0000-000000000003');
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'ac100000-0000-0000-0000-000000000004', '大賞ではなく優秀賞でしたが、仲間と一緒に取れて嬉しいです。', ARRAY[14, 11]::smallint[]);
SELECT pg_temp.ok(true, '제출 실적·수상 실적도 붙일 수 있다');

SELECT pg_temp.fails($s$INSERT INTO social_posts (kind, author_id, body) VALUES ('brag', 'c0000000-0000-0000-0000-000000000001', '実績なし')$s$,
                     '23514', '자랑 글에는 실적이 꼭 있어야 한다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000002')$s$,
                     '23503', '남의 실적은 붙일 수 없다 (활동과 글쓴이는 복합 FK 로 묶여 있다)');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', gen_random_uuid())$s$,
                     '23503', '없는 실적은 붙일 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000005')$s$,
                     '23514', '카드뉴스 공유 기록은 실적이 아니라서 붙일 수 없다 (수상·제출·참가만)');
SELECT pg_temp.fails($s$INSERT INTO social_posts (kind, author_id, activity_id, title, body)
                        VALUES ('brag', 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', '題名', '本文')$s$,
                     '23514', '자랑 글에는 제목을 붙이지 않는다');
SELECT pg_temp.fails($s$INSERT INTO social_posts (kind, author_id, activity_id, company_id, body)
                        VALUES ('brag', 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '本文')$s$,
                     '23514', '자랑 글에는 기업을 붙이지 않는다');

-- 본문 1~200자 (POST_LIMITS.bragBody)
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', repeat('あ', 200));
SELECT pg_temp.ok(true, '자랑 글 본문 200자는 올릴 수 있다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', repeat('あ', 201))$s$,
                     '23514', '자랑 글 본문 201자는 거절한다');
SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', repeat('🏆', 200));
SELECT pg_temp.ok(true, '이모지 200개도 200자다');
SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', '   ' || repeat('あ', 200) || chr(12288) || E'\n');
SELECT pg_temp.ok(true, '앞뒤 공백은 200자에 넣지 않는다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', '')$s$,
                     '23514', '빈 본문은 올릴 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', '   ')$s$,
                     '23514', '공백뿐인 본문은 올릴 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', chr(12288) || chr(12288))$s$,
                     '23514', '전각 공백뿐인 본문도 올릴 수 없다');

-- ───────── 기업 홍보 글 (F-504) ─────────
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', p_challenge => 'e1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(true, '승인된 기업의 담당자는 우리 기업의 챌린지를 연결한 홍보 글을 올릴 수 있다');
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', p_sdgs => ARRAY[14, 12]::smallint[]);
SELECT pg_temp.ok(true, '대표가 아닌 담당자(심사위원)도 올릴 수 있고, 챌린지 연결은 선택이다');

SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '학생은 기업 홍보 글을 올릴 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '다른 기업의 담당자는 우리 기업 이름으로 올릴 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000002')$s$,
                     '23514', '승인 전 기업은 홍보 글을 올릴 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', p_challenge => 'e1000000-0000-0000-0000-0000000000c3')$s$,
                     '23503', '다른 기업의 챌린지는 연결할 수 없다 (챌린지와 기업은 복합 FK 로 묶여 있다)');
SELECT pg_temp.fails($s$INSERT INTO social_posts (kind, author_id, company_id, body) VALUES ('pr', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '本文')$s$,
                     '23514', '홍보 글에는 제목이 꼭 있어야 한다');
SELECT pg_temp.fails($s$INSERT INTO social_posts (kind, author_id, activity_id, company_id, title, body)
                        VALUES ('pr', 'b0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '題', '本文')$s$,
                     '23514', '홍보 글에는 학생의 실적을 붙일 수 없다');
SELECT pg_temp.fails($s$INSERT INTO social_posts (kind, author_id, title, body) VALUES ('pr', 'b0000000-0000-0000-0000-000000000001', '題', '本文')$s$,
                     '23514', '홍보 글에는 기업이 꼭 있어야 한다');

-- 제목 1~40자 · 본문 1~400자 (POST_LIMITS.prTitle · prBody)
SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', repeat('題', 40), repeat('文', 400));
SELECT pg_temp.ok(true, '제목 40자 · 본문 400자는 올릴 수 있다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', repeat('題', 41))$s$,
                     '23514', '제목 41자는 거절한다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '題', repeat('文', 401))$s$,
                     '23514', '본문 401자는 거절한다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '   ')$s$,
                     '23514', '공백뿐인 제목은 올릴 수 없다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '題', '')$s$,
                     '23514', '빈 본문은 올릴 수 없다');

-- 챌린지가 지워지면 연결만 끊기고 글은 남는다 (ON DELETE SET NULL (challenge_id))
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', p_challenge => 'e1000000-0000-0000-0000-000000000003');
SELECT pg_temp.eq((SELECT challenge_id FROM social_posts WHERE id = '90000000-0000-0000-0000-000000000012'), 'e1000000-0000-0000-0000-000000000003'::uuid, '초안 챌린지를 연결한 홍보 글');
DELETE FROM challenges WHERE id = 'e1000000-0000-0000-0000-000000000003';
SELECT pg_temp.eq((SELECT company_id || ':' || COALESCE(challenge_id::text, 'NULL') FROM social_posts WHERE id = '90000000-0000-0000-0000-000000000012'),
                  'd0000000-0000-0000-0000-000000000001:NULL', '챌린지를 지우면 연결(challenge_id)만 비워지고 기업과 글은 그대로다');

-- ───────── 이메일 · 전화번호는 쓸 수 없다 (mask_contacts 와 같은 규칙) ─────────
SELECT pg_temp.fails(format($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', %L)$s$, t.body),
                     '23514', '자랑 글 본문에 연락처가 있으면 거절한다: ' || t.body)
  FROM (VALUES ('連絡は mina@example.com まで'), ('090-1234-5678'), ('+81 90 1234 5678'), ('+82-10-1234-5678'), ('010-1234-5678'), ('03-1234-5678'), ('09012345678'), ('12345678')) AS t(body);
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '電話 090-1234-5678 まで')$s$,
                     '23514', '홍보 글 제목에 연락처가 있으면 거절한다');
SELECT pg_temp.fails($s$SELECT pg_temp.mk_pr(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '題', 'お問い合わせは info@minato.example.jp へ')$s$,
                     '23514', '홍보 글 본문에 이메일이 있으면 거절한다');
SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', t.body)
  FROM (VALUES ('2026-10-30 に受賞'), ('賞金は¥30,000'), ('SDGs14 と SDGs12'), ('Lv.3 / 1,476 pt'), ('11/14 13:00'), ('1234567'), ('17目標すべてに挑戦')) AS t(body);
SELECT pg_temp.ok(true, '날짜·금액·SDGs 번호·7자리 숫자 같은 평범한 숫자는 올릴 수 있다');
SELECT pg_temp.fails($s$UPDATE social_posts SET body = '電話は 090-1234-5678' WHERE id = '90000000-0000-0000-0000-000000000001'$s$,
                     '23514', '고칠 때도 연락처는 쓸 수 없다');

-- ───────── SDGs 태그 (글당 1~3개) ─────────
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', p_sdgs => ARRAY[14, 12, 13]::smallint[]);
SELECT pg_temp.eq((SELECT count(*) FROM social_post_sdgs WHERE post_id = '90000000-0000-0000-0000-000000000020')::int, 3, '홍보 글은 SDGs 를 3개까지 고를 수 있다');
SELECT pg_temp.fails($s$INSERT INTO social_post_sdgs (post_id, position, sdg_id) VALUES ('90000000-0000-0000-0000-000000000020', 4, 7)$s$,
                     '23514', '4번째 태그는 붙일 수 없다 (POST_LIMITS.maxSdgs)');
SELECT pg_temp.fails($s$INSERT INTO social_post_sdgs (post_id, position, sdg_id) VALUES ('90000000-0000-0000-0000-000000000020', 3, 7)$s$,
                     '23505', '같은 자리에 태그를 겹쳐 붙일 수 없다');
SELECT pg_temp.fails($s$INSERT INTO social_post_sdgs (post_id, position, sdg_id) VALUES ('90000000-0000-0000-0000-000000000011', 3, 14)$s$,
                     '23505', '같은 SDG 를 두 번 붙일 수 없다');
SELECT pg_temp.fails($s$INSERT INTO social_post_sdgs (post_id, position, sdg_id) VALUES ('90000000-0000-0000-0000-000000000011', 3, 18)$s$,
                     '23503', '없는 SDG 번호는 붙일 수 없다');

SELECT pg_temp.fails($s$
  INSERT INTO social_posts (id, kind, author_id, company_id, title, body) VALUES ('90000000-0000-0000-0000-0000000000f1', 'pr', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '題', '本文');
  SET CONSTRAINTS social_posts_has_sdg IMMEDIATE
$s$, '23514', '태그가 하나도 없는 글은 올릴 수 없다 (트랜잭션 끝에서 검사)');
SELECT pg_temp.fails($s$
  DELETE FROM social_post_sdgs WHERE post_id = '90000000-0000-0000-0000-000000000011';
  SET CONSTRAINTS social_post_sdgs_keep_one IMMEDIATE
$s$, '23514', '글의 태그를 모두 지울 수는 없다');
DELETE FROM social_post_sdgs WHERE post_id = '90000000-0000-0000-0000-000000000011';
INSERT INTO social_post_sdgs (post_id, position, sdg_id) VALUES ('90000000-0000-0000-0000-000000000011', 1, 13);
SET CONSTRAINTS social_post_sdgs_keep_one IMMEDIATE;
SET CONSTRAINTS social_post_sdgs_keep_one DEFERRED;
SELECT pg_temp.ok(true, '같은 트랜잭션에서 태그를 지우고 새로 붙이면(교체) 통과한다');

SELECT pg_temp.fails($s$SELECT pg_temp.mk_brag(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', '本文', ARRAY[7]::smallint[])$s$,
                     '23514', '자랑 글의 태그는 붙인 실적의 SDGs 가 아니면 거절한다 (실적은 14·12·13·11)');
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000021', 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001', '本文', ARRAY[13, 11, 14]::smallint[]);
SELECT pg_temp.eq((SELECT array_agg(sdg_id ORDER BY position) FROM social_post_sdgs WHERE post_id = '90000000-0000-0000-0000-000000000021'), ARRAY[13, 11, 14]::smallint[],
                  '자랑 글은 실적의 SDGs 중 최대 3개를 고른 순서대로 붙는다');
SELECT pg_temp.fails($s$INSERT INTO social_post_sdgs (post_id, position, sdg_id) VALUES ('90000000-0000-0000-0000-000000000002', 2, 7)$s$,
                     '23514', '이미 올린 자랑 글에도 실적에 없는 SDG 를 더할 수 없다');

-- 글을 지우면 태그·좋아요·공식 게시 신청이 함께 지워진다 (태그 검사에도 걸리지 않는다)
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001');
INSERT INTO social_post_likes (post_id, user_id) VALUES ('90000000-0000-0000-0000-000000000022', 'c0000000-0000-0000-0000-000000000001');
INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000022', jst_date(now()) + 20);
DELETE FROM social_posts WHERE id = '90000000-0000-0000-0000-000000000022';
SET CONSTRAINTS social_post_sdgs_keep_one IMMEDIATE;
SET CONSTRAINTS social_post_sdgs_keep_one DEFERRED;
SELECT pg_temp.eq((SELECT (SELECT count(*) FROM social_post_sdgs WHERE post_id = '90000000-0000-0000-0000-000000000022')
                        + (SELECT count(*) FROM social_post_likes WHERE post_id = '90000000-0000-0000-0000-000000000022')
                        + (SELECT count(*) FROM official_share_slots WHERE post_id = '90000000-0000-0000-0000-000000000022'))::int, 0,
                  '글을 지우면 태그·좋아요·공식 게시 신청이 함께 사라진다');
SELECT pg_temp.eq(next_official_share_date(jst_date(now()) + 19), jst_date(now()) + 20, '지운 글이 잡고 있던 날짜는 다시 빈다');

-- ───────── 좋아요 ─────────
INSERT INTO social_post_likes (post_id, user_id) VALUES
  ('90000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001'),     -- 학생이 기업 글에
  ('90000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-00000000000a'),     -- 다른 기업 담당자가
  ('90000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),     -- 기업이 학생 글에
  ('90000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');     -- 다른 학생이 학생 글에
SELECT pg_temp.ok(true, '남의 글에는 학생도 기업도 좋아요를 누를 수 있다');
SELECT pg_temp.fails($s$INSERT INTO social_post_likes (post_id, user_id) VALUES ('90000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001')$s$,
                     '23505', '같은 사람은 한 글에 좋아요를 한 번만 누른다');
SELECT pg_temp.fails($s$INSERT INTO social_post_likes (post_id, user_id) VALUES ('90000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '내가 쓴 글에는 좋아요를 누를 수 없다');
SELECT pg_temp.fails($s$INSERT INTO social_post_likes (post_id, user_id) VALUES ('90000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '기업 글에는 같은 기업의 대표가 좋아요를 누를 수 없다');
SELECT pg_temp.fails($s$INSERT INTO social_post_likes (post_id, user_id) VALUES ('90000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003')$s$,
                     '23514', '글쓴이가 아니어도 같은 기업의 담당자(심사위원)는 우리 기업의 글에 누를 수 없다');
SELECT pg_temp.eq((SELECT like_count FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000010'), 3, '피드 뷰의 좋아요 수');
DELETE FROM social_post_likes WHERE post_id = '90000000-0000-0000-0000-000000000010' AND user_id = 'c0000000-0000-0000-0000-000000000002';
SELECT pg_temp.eq((SELECT like_count FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000010'), 2, '좋아요를 취소하면 수가 줄어든다');

-- ───────── 공식 SNS 게시 신청 (하루에 한 회사) ─────────
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000030', 'c0000000-0000-0000-0000-000000000001', 'ac100000-0000-0000-0000-000000000001');
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001');   -- 기업 1
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000003');   -- 기업 3
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001');   -- 기업 1 두 번째 글

SELECT pg_temp.eq(next_official_share_date(), jst_date(now()) + 1, '신청이 하나도 없으면 내일부터 배정한다');
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000030', jst_date(now()) + 1)$s$,
                     '23514', '자랑 글에는 공식 SNS 게시를 신청할 수 없다 (기업 홍보 글만)');
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000031', jst_date(now()))$s$,
                     '23514', '오늘로는 신청할 수 없다 (내일부터)');
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000031', jst_date(now()) - 3)$s$,
                     '23514', '지난 날짜로는 신청할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on, status, posted_at) VALUES ('90000000-0000-0000-0000-000000000031', jst_date(now()) + 1, 'posted', now())$s$,
                     '23514', '새 신청을 처음부터 게시 완료로 만들 수는 없다');

INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000031', jst_date(now()) + 1);
SELECT pg_temp.eq((SELECT fee_yen || '/' || status FROM official_share_slots WHERE post_id = '90000000-0000-0000-0000-000000000031'), '3000/scheduled', '신청하면 게시료 ¥3,000 · 예정 상태가 된다 (OFFICIAL_SHARE_FEE_YEN)');
SELECT pg_temp.eq(next_official_share_date(), jst_date(now()) + 2, '내일을 누가 받았으면 다음은 모레다');
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000032', jst_date(now()) + 1)$s$,
                     '23505', '같은 날짜를 다른 기업이 또 신청할 수 없다 (하루에 한 회사)');
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000031', jst_date(now()) + 5)$s$,
                     '23505', '한 글에 신청은 한 번뿐이다');
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on, fee_yen) VALUES ('90000000-0000-0000-0000-000000000032', jst_date(now()) + 2, -1)$s$,
                     '23514', '게시료는 음수가 될 수 없다');
INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000032', jst_date(now()) + 3);   -- 모레(+2)를 비워 둔다
SELECT pg_temp.eq(next_official_share_date(), jst_date(now()) + 2, '중간에 빈 날짜가 있으면 가장 빠른 빈 날짜를 배정한다');
INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000033', jst_date(now()) + 2);
SELECT pg_temp.eq(next_official_share_date(), jst_date(now()) + 4, '빈 날짜를 채우면 그다음 날로 넘어간다');
SELECT pg_temp.eq(next_official_share_date(jst_date(now()) + 10), jst_date(now()) + 11, '기준일이 뒤면 그 다음 날부터 본다 (지난 신청은 상관없다)');

-- 상태: 예정 → 게시 완료 / 취소만, 끝난 신청은 되돌릴 수 없다
UPDATE official_share_slots SET status = 'cancelled' WHERE post_id = '90000000-0000-0000-0000-000000000032';
SELECT pg_temp.eq(next_official_share_date(), jst_date(now()) + 3, '취소하면 그 날짜(+3)가 다시 빈다');
SELECT pg_temp.fails($s$UPDATE official_share_slots SET status = 'scheduled' WHERE post_id = '90000000-0000-0000-0000-000000000032'$s$,
                     '23514', '취소한 신청을 다시 예정으로 되돌릴 수 없다');
UPDATE official_share_slots SET status = 'posted' WHERE post_id = '90000000-0000-0000-0000-000000000033';
SELECT pg_temp.ok((SELECT posted_at IS NOT NULL FROM official_share_slots WHERE post_id = '90000000-0000-0000-0000-000000000033'), '게시 완료가 되면 게시 시각이 자동으로 기록된다');
SELECT pg_temp.eq(next_official_share_date(), jst_date(now()) + 3, '게시 완료된 날짜(+2)도 계속 잡혀 있다');
SELECT pg_temp.fails($s$UPDATE official_share_slots SET status = 'cancelled' WHERE post_id = '90000000-0000-0000-0000-000000000033'$s$,
                     '23514', '게시를 마친 신청은 취소할 수 없다');
SELECT pg_temp.fails($s$UPDATE official_share_slots SET scheduled_on = jst_date(now()) + 9 WHERE post_id = '90000000-0000-0000-0000-000000000033'$s$,
                     '23514', '게시를 마친 신청의 날짜는 바꿀 수 없다');
SELECT pg_temp.fails($s$UPDATE official_share_slots SET posted_at = now() WHERE post_id = '90000000-0000-0000-0000-000000000031'$s$,
                     '23514', '예정 상태에는 게시 시각이 있을 수 없다');
SELECT pg_temp.fails($s$UPDATE official_share_slots SET scheduled_on = jst_date(now()) WHERE post_id = '90000000-0000-0000-0000-000000000031'$s$,
                     '23514', '예정일을 오늘 이전으로 옮길 수 없다');
UPDATE official_share_slots SET scheduled_on = jst_date(now()) + 8 WHERE post_id = '90000000-0000-0000-0000-000000000031';
SELECT pg_temp.eq(next_official_share_date(), jst_date(now()) + 1, '예정 상태의 신청은 날짜를 옮길 수 있고, 비운 날짜(+1)는 다시 빈다');
DELETE FROM social_posts WHERE id = '90000000-0000-0000-0000-000000000031';
SELECT pg_temp.eq((SELECT count(*) FROM official_share_slots WHERE scheduled_on = jst_date(now()) + 8)::int, 0, '글을 지우면 신청도 사라지고 날짜가 비워진다');

-- ───────── 고칠 때의 규칙 ─────────
UPDATE social_posts SET body = '内容を少し直しました。' WHERE id = '90000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok(true, '본문은 고칠 수 있다');
SELECT pg_temp.fails($s$UPDATE social_posts SET body = repeat('あ', 201) WHERE id = '90000000-0000-0000-0000-000000000001'$s$, '23514', '고쳐도 200자를 넘을 수 없다');
SELECT pg_temp.fails($s$UPDATE social_posts SET kind = 'pr' WHERE id = '90000000-0000-0000-0000-000000000001'$s$, '23001', '글의 종류는 바꿀 수 없다');
SELECT pg_temp.fails($s$UPDATE social_posts SET author_id = 'c0000000-0000-0000-0000-000000000002' WHERE id = '90000000-0000-0000-0000-000000000001'$s$, '23001', '글쓴이는 바꿀 수 없다');
SELECT pg_temp.fails($s$UPDATE social_posts SET activity_id = 'ac100000-0000-0000-0000-000000000005' WHERE id = '90000000-0000-0000-0000-000000000001'$s$, '23001', '붙인 실적은 바꿀 수 없다 (공유 기록으로 바꿔치기 막기)');
SELECT pg_temp.fails($s$UPDATE social_posts SET company_id = 'd0000000-0000-0000-0000-000000000003' WHERE id = '90000000-0000-0000-0000-000000000010'$s$, '23001', '홍보 글의 기업은 바꿀 수 없다');
SELECT pg_temp.fails($s$UPDATE social_posts SET challenge_id = 'e1000000-0000-0000-0000-0000000000c3' WHERE id = '90000000-0000-0000-0000-000000000010'$s$, '23503', '연결 챌린지를 다른 기업의 것으로 바꿀 수 없다');
UPDATE social_posts SET challenge_id = NULL WHERE id = '90000000-0000-0000-0000-000000000010';
SELECT pg_temp.ok(true, '연결한 챌린지는 끊을 수 있다');
UPDATE social_posts SET challenge_id = 'e1000000-0000-0000-0000-000000000001' WHERE id = '90000000-0000-0000-0000-000000000010';

-- ───────── 지워질 때 (실적·계정) ─────────
SELECT pg_temp.mk_activity('ac100000-0000-0000-0000-0000000000f1', 'c0000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', ARRAY[7]::smallint[]);
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000040', 'c0000000-0000-0000-0000-000000000002', 'ac100000-0000-0000-0000-0000000000f1', '本文', ARRAY[7]::smallint[]);
DELETE FROM activities WHERE id = 'ac100000-0000-0000-0000-0000000000f1';
SELECT pg_temp.eq((SELECT count(*) FROM social_posts WHERE id = '90000000-0000-0000-0000-000000000040')::int, 0, '실적이 지워지면 그 실적을 붙인 자랑 글도 함께 지워진다');

INSERT INTO users (id, email, role, status, locale) VALUES ('c0000000-0000-0000-0000-0000000000ee', 'temp@example.com', 'b2c', 'active', 'ja');
INSERT INTO student_profiles (user_id, nickname) VALUES ('c0000000-0000-0000-0000-0000000000ee', 'Temp');
SELECT pg_temp.mk_activity('ac100000-0000-0000-0000-0000000000f2', 'c0000000-0000-0000-0000-0000000000ee', 'e1000000-0000-0000-0000-000000000001', ARRAY[14]::smallint[]);
SELECT pg_temp.mk_brag('90000000-0000-0000-0000-000000000041', 'c0000000-0000-0000-0000-0000000000ee', 'ac100000-0000-0000-0000-0000000000f2');
INSERT INTO social_post_likes (post_id, user_id) VALUES ('90000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-0000000000ee');
DELETE FROM users WHERE id = 'c0000000-0000-0000-0000-0000000000ee';
SELECT pg_temp.eq((SELECT count(*) FROM social_posts WHERE id = '90000000-0000-0000-0000-000000000041')::int
                  + (SELECT count(*) FROM social_post_likes WHERE user_id = 'c0000000-0000-0000-0000-0000000000ee')::int, 0, '계정이 지워지면 그 사람의 글과 좋아요도 함께 지워진다');

-- ───────── 피드 뷰 ─────────
SELECT pg_temp.eq((SELECT author_name || ' Lv.' || author_level || ' ' || achievement_kind || '/' || achievement_award || ' ' || sdg_ids::text || ' ' || like_count
                     FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000003'),
                  'Ren Lv.2 award/excellence {14,11} 0', '자랑 글: 닉네임 · 레벨(300 pt = Lv.2) · 수상 실적 · 태그(고른 순서) · 좋아요');
SELECT pg_temp.eq((SELECT author_name || ' Lv.' || author_level FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000001'), 'Mina Lv.1', '활동이 적은 학생은 Lv.1 로 나온다 (참가 50 + 공유 10 = 60 pt)');
SELECT pg_temp.eq((SELECT author_name || '/' || company_industry || '/' || company_verified || '/' || COALESCE(author_level::text, '-') || '/' || COALESCE(achievement_kind::text, '-')
                     FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000010'),
                  'みなと海洋フーズ/食品/true/-/-', '홍보 글: 기업 이름 · 업종 · 인증 ✓ (레벨·실적은 없다)');
SELECT pg_temp.eq((SELECT challenge_id FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000010'), 'e1000000-0000-0000-0000-000000000001'::uuid, '홍보 글에 연결한 챌린지가 보인다');
SELECT pg_temp.eq((SELECT official_on FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000033'), jst_date(now()) + 2, '공식 SNS 게시 날짜가 보인다');
SELECT pg_temp.eq((SELECT count(*) FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000032' AND official_on IS NULL)::int, 1, '취소한 신청의 날짜는 보이지 않는다');
SELECT pg_temp.none($q$SELECT column_name FROM information_schema.columns WHERE table_name = 'feed_posts' AND column_name ~* '(mail|phone|tel|contact|password)'$q$,
                    '피드 뷰에는 이메일·전화번호 같은 연락처 열이 없다');
SELECT pg_temp.eq((SELECT count(*) FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000002')::int, 1, '블라인드 전에는 피드에 보인다');
UPDATE social_posts SET blinded_at = now() WHERE id = '90000000-0000-0000-0000-000000000002';
SELECT pg_temp.eq((SELECT count(*) FROM feed_posts WHERE id = '90000000-0000-0000-0000-000000000002')::int, 0, '블라인드된 글은 피드에서 빠진다 (F-702)');
SELECT pg_temp.fails($s$INSERT INTO social_post_likes (post_id, user_id) VALUES ('90000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '블라인드된 글에는 좋아요를 누를 수 없다');
SELECT pg_temp.mk_pr('90000000-0000-0000-0000-000000000050', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001');
UPDATE social_posts SET blinded_at = now() WHERE id = '90000000-0000-0000-0000-000000000050';
SELECT pg_temp.fails($s$INSERT INTO official_share_slots (post_id, scheduled_on) VALUES ('90000000-0000-0000-0000-000000000050', jst_date(now()) + 15)$s$,
                     '23514', '블라인드된 글에는 공식 SNS 게시를 신청할 수 없다');
SELECT pg_temp.eq((SELECT count(*) FROM feed_posts WHERE kind = 'brag')::int, (SELECT count(*) FROM social_posts WHERE kind = 'brag' AND blinded_at IS NULL)::int, '뷰의 자랑 글 수는 블라인드 제외 글 수와 같다');

-- ───────── 신고 · 번역 ─────────
INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ('c0000000-0000-0000-0000-000000000002', 'post', '90000000-0000-0000-0000-000000000001', 'inappropriate');
SELECT pg_temp.ok(true, '글(post)도 신고할 수 있다 (F-702)');
INSERT INTO content_translations (entity, entity_id, field, locale, body) VALUES ('social_post', '90000000-0000-0000-0000-000000000010', 'body', 'ko', '번역된 홍보 글');
SELECT pg_temp.ok(true, '피드 글(social_post)의 번역을 캐시에 둘 수 있다');

ROLLBACK;
\echo '06_feed: 통과'
