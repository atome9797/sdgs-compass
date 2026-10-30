-- SNS 피드 시험용 세계 — 04_parity.sql · 06_feed.sql 이 fixtures.sql · feed_fixtures.sql 다음에 \ir 로 불러와요 (트랜잭션 안에서만 살아 있어요).
--   기업     d..01 みなと海洋フーズ(승인, 대표 b..01) · d..02(승인 대기) · d..03 まちづくりラボ(승인, 담당자 b..0a)
--   챌린지   e1..01 d..01 의 모집 중 챌린지 · e1..c3 d..03 의 챌린지
--   활동     ac1..01 Mina 의 참가 실적(SDGs 14·12·13·11) · ac1..02 Rin 의 참가 실적(SDG 7) · ac1..05 Mina 의 카드뉴스 공유 기록(실적이 아님)
INSERT INTO users (id, email, role, status, locale, email_verified_at) VALUES
  ('b0000000-0000-0000-0000-00000000000a', 'owner@machi.example', 'b2b', 'active', 'ja', now());
INSERT INTO companies (id, owner_id, name, business_number, status, approved_at, approved_by, industry, region, source_lang) VALUES
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-00000000000a', 'まちづくりラボ', '9876543210987', 'approved', now(), 'a0000000-0000-0000-0000-000000000001', '地域開発', '大阪府', 'ja');
INSERT INTO company_members (company_id, user_id, member_role) VALUES ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-00000000000a', 'owner');

SELECT pg_temp.mk_challenge('e1000000-0000-0000-0000-000000000001'::uuid);
INSERT INTO challenges (id, company_id, created_by, title, summary, closes_at)
  VALUES ('e1000000-0000-0000-0000-0000000000c3', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-00000000000a', '他社の課題', '要約', now() + interval '30 days');

SELECT pg_temp.mk_activity('ac100000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', ARRAY[14, 12, 13, 11]::smallint[]);
SELECT pg_temp.mk_activity('ac100000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', ARRAY[7]::smallint[]);
INSERT INTO share_cards (id, user_id, template, headline) VALUES ('dd100000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'instagram', '共有しました');
INSERT INTO activities (id, user_id, kind, share_card_id, title, company_name, points, occurred_on)
  VALUES ('ac100000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'share', 'dd100000-0000-0000-0000-000000000001', '共有', '-', 10, current_date);
