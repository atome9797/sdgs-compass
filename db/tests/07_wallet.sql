-- #25 リワード残高의 규칙: 상금 예치(과제의 상금과 같은 금액) → 최우수상이면 송금 → 원장 입금, 최우수상 없이 마감되면 반환,
-- 본인 확인 전 출금 금지 · 잔액보다 많이 출금 금지 · 1회 100만 엔 이하, 운영 환원 총액(생성 열)과 배분 합계, 원장은 고칠 수 없음.
-- 앱(packages/core/src/wallet.ts)과 같은 값인지는 04_parity.sql 이 따로 맞춰 봐요. 여기서는 DB 가 규칙을 어기는 입력을 실제로 막는지 확인해요.
\ir helpers.sql
BEGIN;
\ir fixtures.sql

-- ───────── 시험용 세계 ─────────
-- 학생 Mina(c..01) Rin(c..02) Kai(c..03) · 승인된 기업 みなと海洋フーズ(d..01: 대표 b..01, 심사위원 b..02·b..03) · 관리자 a..01
-- 과제 e7..01(상금 ¥50,000 — 최우수상까지), e7..02(상금 ¥30,000 — 최우수상 없이 마감), e7..03(상금 없음)
SELECT pg_temp.mk_challenge('e7000000-0000-0000-0000-000000000001'::uuid);
SELECT pg_temp.mk_challenge('e7000000-0000-0000-0000-000000000002'::uuid);
SELECT pg_temp.mk_challenge('e7000000-0000-0000-0000-000000000003'::uuid);
INSERT INTO challenge_rewards (challenge_id, kind, amount_yen) VALUES
  ('e7000000-0000-0000-0000-000000000001', 'prize', 50000),
  ('e7000000-0000-0000-0000-000000000002', 'prize', 30000);

-- ───────── 상금 예치 ─────────
SELECT pg_temp.fails($s$INSERT INTO prize_deposits (challenge_id, company_id, amount_yen) VALUES ('e7000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 40000)$s$,
                     '23503', '맡기는 금액은 그 과제의 상금과 같아야 한다 (복합 FK)');
SELECT pg_temp.fails($s$INSERT INTO prize_deposits (challenge_id, company_id, amount_yen) VALUES ('e7000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 10000)$s$,
                     '23503', '상금이 없는 과제에는 예치할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO prize_deposits (challenge_id, company_id, amount_yen) VALUES ('e7000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 50000)$s$,
                     '23503', '다른 기업의 과제에는 예치할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO prize_deposits (challenge_id, company_id, amount_yen, status, settled_at) VALUES ('e7000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 50000, 'refunded', now())$s$,
                     '23514', '예치는 deposited 상태로만 새로 만든다');
INSERT INTO prize_deposits (id, challenge_id, company_id, amount_yen) VALUES
  ('a7000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 50000),
  ('a7000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 30000);
SELECT pg_temp.fails($s$INSERT INTO prize_deposits (challenge_id, company_id, amount_yen) VALUES ('e7000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 50000)$s$,
                     '23505', '과제당 예치는 1건');
SELECT pg_temp.fails($s$UPDATE challenge_rewards SET amount_yen = 60000 WHERE challenge_id = 'e7000000-0000-0000-0000-000000000001' AND kind = 'prize'$s$,
                     '23503', '맡긴 뒤에는 과제의 상금 금액만 따로 바꿀 수 없다');
SELECT pg_temp.fails($s$UPDATE prize_deposits SET amount_yen = 1 WHERE id = 'a7000000-0000-0000-0000-000000000001'$s$, '23514', '맡긴 금액은 바꿀 수 없다');
SELECT pg_temp.fails($s$DELETE FROM prize_deposits WHERE id = 'a7000000-0000-0000-0000-000000000001'$s$, '23001', '예치 기록은 지울 수 없다');
SELECT pg_temp.fails($s$UPDATE prize_deposits SET status = 'refunded' WHERE id = 'a7000000-0000-0000-0000-000000000002'$s$, '23514', '모집 중인 과제의 상금은 반환할 수 없다');
SELECT pg_temp.eq((SELECT deposited_yen FROM company_prize_summary WHERE company_id = 'd0000000-0000-0000-0000-000000000001'), 80000::bigint, '기업 요약: 예치 중 ¥80,000');

-- ───────── 제출 → 심사 → 수상 → 송금 ─────────
SELECT pg_temp.mk_proposal('f7000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001');  -- Mina
SELECT pg_temp.mk_proposal('f7000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');  -- Rin
SELECT pg_temp.mk_proposal('f7000000-0000-0000-0000-000000000003', 'e7000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003');  -- Kai
SET CONSTRAINTS proposals_has_version IMMEDIATE;
SET CONSTRAINTS proposals_has_version DEFERRED;
UPDATE challenges SET status = 'judging' WHERE id IN ('e7000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000002');
INSERT INTO reviews (proposal_id, challenge_id, judge_id, creativity, feasibility, sdg_contribution)
  SELECT p.id, p.challenge_id, j.judge, 4, 4, 4
    FROM proposals p CROSS JOIN (VALUES ('b0000000-0000-0000-0000-000000000002'::uuid), ('b0000000-0000-0000-0000-000000000003'::uuid)) j(judge)
   WHERE p.id IN ('f7000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000002', 'f7000000-0000-0000-0000-000000000003');

-- 우수상(Rin)은 송금하지 않아요
INSERT INTO awards (id, proposal_id, challenge_id, kind, awarded_by)
  VALUES ('a7a00000-0000-0000-0000-000000000002', 'f7000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000001', 'excellence', 'b0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT status::text FROM prize_deposits WHERE id = 'a7000000-0000-0000-0000-000000000001'), 'deposited', '우수상으로는 상금을 보내지 않는다');
SELECT pg_temp.fails($s$UPDATE prize_deposits SET status = 'paid', award_id = 'a7a00000-0000-0000-0000-000000000002' WHERE id = 'a7000000-0000-0000-0000-000000000001'$s$,
                     '23503', '손으로 우수상에 송금하려 해도 막힌다 (최우수상만 — 복합 FK)');
SELECT pg_temp.fails($s$INSERT INTO wallet_accounts (user_id) VALUES ('b0000000-0000-0000-0000-000000000001')$s$, '23503', '지갑 계정은 학생만 (기업 담당자는 안 됨)');

-- 최우수상(Mina) → 예치가 송금으로 바뀌고, Mina 의 지갑 계정이 생기고, 원장에 ¥50,000 이 들어와요
INSERT INTO awards (id, proposal_id, challenge_id, kind, awarded_by)
  VALUES ('a7a00000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000001', 'grand', 'b0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT status::text || ':' || award_id::text || ':' || (settled_at IS NOT NULL)::text FROM prize_deposits WHERE id = 'a7000000-0000-0000-0000-000000000001'),
                  'paid:a7a00000-0000-0000-0000-000000000001:true', '최우수상이 정해지면 맡긴 상금을 송금한다 (송금 시각 기록)');
SELECT pg_temp.eq((SELECT kind::text || ':' || amount_yen FROM wallet_entries WHERE user_id = 'c0000000-0000-0000-0000-000000000001'), 'prize:50000', '수상 팀 제출자(Mina)의 원장에 상금이 들어온다');
SELECT pg_temp.eq((SELECT kyc_status::text || ':' || balance_yen FROM wallet_balances WHERE user_id = 'c0000000-0000-0000-0000-000000000001'), 'none:50000', '잔액 ¥50,000 · 본인 확인 전');
SELECT pg_temp.fails($s$UPDATE prize_deposits SET status = 'refunded' WHERE id = 'a7000000-0000-0000-0000-000000000001'$s$, '23514', '한 번 보낸 상금은 반환으로 바꿀 수 없다');
SELECT pg_temp.fails($s$INSERT INTO wallet_entries (user_id, kind, amount_yen, prize_deposit_id) VALUES ('c0000000-0000-0000-0000-000000000002', 'prize', 50000, 'a7000000-0000-0000-0000-000000000001')$s$,
                     '23514', '상금 입금은 그 최우수상의 제출자에게만');
SELECT pg_temp.fails($s$UPDATE wallet_entries SET amount_yen = 99999 WHERE user_id = 'c0000000-0000-0000-0000-000000000001'$s$, '23001', '원장은 고칠 수 없다');
SELECT pg_temp.fails($s$DELETE FROM wallet_entries WHERE user_id = 'c0000000-0000-0000-0000-000000000001'$s$, '23001', '원장은 지울 수 없다');

-- 최우수상 없이 마감된 과제(e7..02) → 기업에 반환
SELECT pg_temp.fails($s$UPDATE prize_deposits SET status = 'refunded' WHERE id = 'a7000000-0000-0000-0000-000000000002'$s$, '23514', '심사 중(judging)에는 반환할 수 없다');
UPDATE challenges SET status = 'closed' WHERE id = 'e7000000-0000-0000-0000-000000000002';
UPDATE prize_deposits SET status = 'refunded' WHERE id = 'a7000000-0000-0000-0000-000000000002';
SELECT pg_temp.eq((SELECT paid_yen || ':' || refunded_yen || ':' || deposited_yen FROM company_prize_summary WHERE company_id = 'd0000000-0000-0000-0000-000000000001'), '50000:30000:0',
                  '기업 요약: 송금 ¥50,000 · 반환 ¥30,000 · 예치 중 ¥0');
SELECT pg_temp.fails($s$UPDATE prize_deposits SET status = 'deposited', settled_at = NULL WHERE id = 'a7000000-0000-0000-0000-000000000002'$s$, '23514', '반환한 상금을 다시 예치 중으로 돌릴 수 없다');

-- ───────── 본인 확인 → 출금 신청 ─────────
SELECT pg_temp.fails($s$INSERT INTO withdrawal_requests (user_id, amount_yen) VALUES ('c0000000-0000-0000-0000-000000000001', 1000)$s$, '23514', '본인 확인 전에는 출금할 수 없다');
SELECT pg_temp.fails($s$UPDATE wallet_accounts SET kyc_status = 'verified' WHERE user_id = 'c0000000-0000-0000-0000-000000000001'$s$, '23514', '본인 확인 완료에는 완료 시각이 함께 있어야 한다');
UPDATE wallet_accounts SET kyc_status = 'verified', kyc_verified_at = now() WHERE user_id = 'c0000000-0000-0000-0000-000000000001';
INSERT INTO withdrawal_requests (id, user_id, amount_yen) VALUES ('a7b00000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 20000);
SELECT pg_temp.eq((SELECT withdrawn_yen || ':' || balance_yen FROM wallet_balances WHERE user_id = 'c0000000-0000-0000-0000-000000000001'), '20000:30000', '출금을 신청하면 원장에 출금이 생기고 잔액에서 바로 빠진다');
SELECT pg_temp.fails($s$INSERT INTO withdrawal_requests (user_id, amount_yen) VALUES ('c0000000-0000-0000-0000-000000000001', 30001)$s$, '23514', '잔액보다 많이 출금할 수 없다');
SELECT pg_temp.fails($s$INSERT INTO withdrawal_requests (user_id, amount_yen) VALUES ('c0000000-0000-0000-0000-000000000001', 0)$s$, '23514', '0엔 출금은 안 된다');
SELECT pg_temp.fails($s$INSERT INTO withdrawal_requests (user_id, amount_yen, status, completed_at) VALUES ('c0000000-0000-0000-0000-000000000001', 100, 'completed', now())$s$, '23514', '출금은 신청 상태로만 만든다');
INSERT INTO withdrawal_requests (user_id, amount_yen) VALUES ('c0000000-0000-0000-0000-000000000001', 30000);
SELECT pg_temp.eq((SELECT balance_yen FROM wallet_balances WHERE user_id = 'c0000000-0000-0000-0000-000000000001'), 0::bigint, '잔액 전부를 출금할 수 있다 (잔액 0)');
UPDATE withdrawal_requests SET status = 'completed', completed_at = now() WHERE id = 'a7b00000-0000-0000-0000-000000000001';
SELECT pg_temp.fails($s$UPDATE withdrawal_requests SET status = 'requested', completed_at = NULL WHERE id = 'a7b00000-0000-0000-0000-000000000001'$s$, '23514', '송금을 마친 출금은 되돌릴 수 없다');
SELECT pg_temp.fails($s$UPDATE withdrawal_requests SET amount_yen = 1 WHERE id = 'a7b00000-0000-0000-0000-000000000001'$s$, '23514', '출금 금액은 바꿀 수 없다');
SELECT pg_temp.fails($s$DELETE FROM withdrawal_requests WHERE id = 'a7b00000-0000-0000-0000-000000000001'$s$, '23001', '출금 신청 기록은 지울 수 없다');

-- ───────── 운영 환원 ─────────
-- (숫자는 모두 가상) 3기: 기말 자금이 운전자금 3개월분에 못 미쳐 환원 0 — 배분 없이도 통과해요
INSERT INTO reward_return_rounds (period_label, period_start, period_end, ordinary_profit_yen, period_costs_yen, period_end_cash_yen, criteria, criteria_published_on, decided_on, decided_by)
  VALUES ('第3期（仮）', '2028-04-01', '2029-03-31', 800000, 6000000, 1200000, '受賞・提出の実績（作業時間・量には比例しない）', '2028-03-01', '2029-05-31', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT reserve_months || ':' || reserve_yen || ':' || total_yen FROM reward_return_rounds WHERE period_label = '第3期（仮）'), '3:1500000:0',
                  '운전자금 3개월분 ¥1,500,000 > 기말 자금 ¥1,200,000 → 환원 0 (생성 열)');
SET CONSTRAINTS reward_return_rounds_balanced IMMEDIATE;
SET CONSTRAINTS reward_return_rounds_balanced DEFERRED;
SELECT pg_temp.ok(true, '환원 0 인 회차는 배분이 없어도 된다');

-- 4기: 자금 − 적립 ¥300,000 < 이익 ¥900,000 → 부분 환원 ¥300,000 = Mina ¥200,000 + Rin ¥100,000
INSERT INTO reward_return_rounds (id, period_label, period_start, period_end, ordinary_profit_yen, period_costs_yen, period_end_cash_yen, criteria, criteria_published_on, decided_on, decided_by)
  VALUES ('a7c00000-0000-0000-0000-000000000004', '第4期（仮）', '2029-04-01', '2030-03-31', 900000, 6000000, 1800000, '受賞・提出の実績', '2029-03-01', '2030-05-31', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT total_yen FROM reward_return_rounds WHERE period_label = '第4期（仮）'), 300000::bigint, '환원 총액 = min(이익, 자금 − 적립) = ¥300,000');
INSERT INTO reward_return_allocations (round_id, user_id, amount_yen, basis) VALUES
  ('a7c00000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 200000, '最優秀賞 1件・提出 2件'),
  ('a7c00000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 100000, '優秀賞 1件・提出 1件');
SET CONSTRAINTS reward_return_rounds_balanced, reward_return_allocations_balanced IMMEDIATE;
SET CONSTRAINTS reward_return_rounds_balanced, reward_return_allocations_balanced DEFERRED;
SELECT pg_temp.ok(true, '배분 합계 = 환원 총액이면 통과한다');
SELECT pg_temp.eq((SELECT return_yen || ':' || balance_yen FROM wallet_balances WHERE user_id = 'c0000000-0000-0000-0000-000000000001'), '200000:200000', '배분하면 원장에 환원이 자동으로 들어온다 (Mina)');
SELECT pg_temp.eq((SELECT kyc_status::text || ':' || balance_yen FROM wallet_balances WHERE user_id = 'c0000000-0000-0000-0000-000000000002'), 'none:100000', 'Rin 은 지갑 계정이 자동으로 생기고 본인 확인 전');
SELECT pg_temp.fails($s$INSERT INTO reward_return_allocations (round_id, user_id, amount_yen, basis) VALUES ('a7c00000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 1, '企業')$s$,
                     '23503', '환원은 학생에게만 (기업 담당자는 지갑 계정을 만들 수 없다)');
SELECT pg_temp.fails($s$UPDATE reward_return_rounds SET ordinary_profit_yen = 1 WHERE period_label = '第4期（仮）'$s$, '23001', '정한 회차는 고칠 수 없다');
SELECT pg_temp.fails($s$UPDATE reward_return_allocations SET amount_yen = 1 WHERE user_id = 'c0000000-0000-0000-0000-000000000002'$s$, '23001', '배분은 고칠 수 없다');
SELECT pg_temp.fails($s$INSERT INTO reward_return_rounds (period_label, period_start, period_end, ordinary_profit_yen, period_costs_yen, period_end_cash_yen, criteria, criteria_published_on, decided_on, decided_by)
                        VALUES ('第5期', '2030-04-01', '2031-03-31', 1, 1, 1, '基準', '2030-04-02', '2031-05-31', 'a0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '배분 기준은 그 기가 시작하기 전에 공개해야 한다');
SELECT pg_temp.fails($s$INSERT INTO reward_return_rounds (period_label, period_start, period_end, ordinary_profit_yen, period_costs_yen, period_end_cash_yen, criteria, criteria_published_on, decided_on, decided_by)
                        VALUES ('第5期', '2030-04-01', '2031-03-31', 1, 1, 1, '基準', '2030-03-01', '2031-03-31', 'a0000000-0000-0000-0000-000000000001')$s$,
                     '23514', '환원은 기가 끝난 뒤에 정한다');

-- Rin: 환원 ¥100,000 → 본인 확인 → 1회 상한 시험을 위해 잔액이 많은 경우는 5기(전액 환원 ¥1,500,000)로
INSERT INTO reward_return_rounds (id, period_label, period_start, period_end, ordinary_profit_yen, period_costs_yen, period_end_cash_yen, criteria, criteria_published_on, decided_on, decided_by)
  VALUES ('a7c00000-0000-0000-0000-000000000005', '第5期（仮）', '2030-04-01', '2031-03-31', 1500000, 4000000, 9000000, '受賞・提出の実績', '2030-03-01', '2031-05-31', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.eq((SELECT total_yen FROM reward_return_rounds WHERE period_label = '第5期（仮）'), 1500000::bigint, '자금이 넉넉하면 이익 전부를 환원한다');
INSERT INTO reward_return_allocations (round_id, user_id, amount_yen, basis) VALUES ('a7c00000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 1500000, '最優秀賞 2件');
SET CONSTRAINTS reward_return_rounds_balanced, reward_return_allocations_balanced IMMEDIATE;
SET CONSTRAINTS reward_return_rounds_balanced, reward_return_allocations_balanced DEFERRED;
UPDATE wallet_accounts SET kyc_status = 'verified', kyc_verified_at = now() WHERE user_id = 'c0000000-0000-0000-0000-000000000002';
SELECT pg_temp.fails($s$INSERT INTO withdrawal_requests (user_id, amount_yen) VALUES ('c0000000-0000-0000-0000-000000000002', 1000001)$s$, '23514', '잔액이 많아도 1회 출금은 100만 엔까지');
INSERT INTO withdrawal_requests (user_id, amount_yen) VALUES ('c0000000-0000-0000-0000-000000000002', 1000000);
SELECT pg_temp.eq((SELECT balance_yen FROM wallet_balances WHERE user_id = 'c0000000-0000-0000-0000-000000000002'), 600000::bigint, '100만 엔은 한 번에 출금할 수 있다 (남은 잔액 ¥600,000)');

-- 배분 합계가 환원 총액과 다르면 트랜잭션 끝에서 막혀요 (마지막에 시험 — 이 뒤로는 지연 제약을 다시 검사하지 않아요)
INSERT INTO reward_return_rounds (id, period_label, period_start, period_end, ordinary_profit_yen, period_costs_yen, period_end_cash_yen, criteria, criteria_published_on, decided_on, decided_by)
  VALUES ('a7c00000-0000-0000-0000-000000000006', '第6期（仮）', '2031-04-01', '2032-03-31', 300000, 1200000, 5000000, '受賞・提出の実績', '2031-03-01', '2032-05-31', 'a0000000-0000-0000-0000-000000000001');
SELECT pg_temp.fails($s$
  INSERT INTO reward_return_allocations (round_id, user_id, amount_yen, basis) VALUES ('a7c00000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 100000, '提出 1件');
  SET CONSTRAINTS reward_return_rounds_balanced, reward_return_allocations_balanced IMMEDIATE
$s$, '23514', '배분 합계(¥100,000)가 환원 총액(¥300,000)과 다르면 막힌다');

ROLLBACK;
