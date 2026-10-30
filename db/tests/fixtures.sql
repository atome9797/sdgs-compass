-- 시험용 기본 세계: 관리자 1, 기업 2곳(승인 1·대기 1), 학생 5명, 심사위원 2명. 모든 id 는 알아보기 쉬운 고정값이에요.
-- (각 시험 파일이 BEGIN 한 뒤 불러오고, 끝에서 ROLLBACK 해요.)
INSERT INTO users (id, email, role, status, locale, email_verified_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@example.com',   'admin', 'active', 'ko', now()),
  ('b0000000-0000-0000-0000-000000000001', 'owner@minato.example', 'b2b',  'active', 'ja', now()),
  ('b0000000-0000-0000-0000-000000000002', 'judge1@minato.example','b2b',  'active', 'ja', now()),
  ('b0000000-0000-0000-0000-000000000003', 'judge2@minato.example','b2b',  'active', 'ja', now()),
  ('b0000000-0000-0000-0000-000000000009', 'owner@pending.example','b2b',  'active', 'ja', now()),
  ('c0000000-0000-0000-0000-000000000001', 'mina@example.com',    'b2c',   'active', 'ja', now()),
  ('c0000000-0000-0000-0000-000000000002', 'rin@example.com',    'b2c',   'active', 'ja', now()),
  ('c0000000-0000-0000-0000-000000000003', 'kai@example.com', 'b2c',   'active', 'ko', now()),
  ('c0000000-0000-0000-0000-000000000004', 'ren@example.com',     'b2c',   'active', 'ja', now()),
  ('c0000000-0000-0000-0000-000000000005', 'mei@example.com',     'b2c',   'active', 'ja', now());

INSERT INTO student_profiles (user_id, nickname, university_name, faculty, grad_year, scoutable, portfolio_visibility) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Mina',     'サンプル大学', '経営学部', 2028, true,  'scouts_only'),
  ('c0000000-0000-0000-0000-000000000002', 'Rin',      'サンプル大学', '商学部',   2027, true,  'public'),
  ('c0000000-0000-0000-0000-000000000003', 'Kai',      'サンプル大学', '情報学部', 2027, true, 'scouts_only'),
  ('c0000000-0000-0000-0000-000000000004', 'Ren',      'サンプル大学', '法学部',   2028, true,  'scouts_only'),
  ('c0000000-0000-0000-0000-000000000005', 'Mei',      'サンプル大学', '文学部',   2028, false, 'private');

INSERT INTO companies (id, owner_id, name, business_number, status, approved_at, approved_by, industry, region, source_lang)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'みなと海洋フーズ', '1234567890123', 'approved', now(), 'a0000000-0000-0000-0000-000000000001', '食品', '神奈川県', 'ja'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', '承認待ちの会社', NULL, 'pending', NULL, NULL, 'IT', '東京都', 'ja');

INSERT INTO company_members (company_id, user_id, member_role) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'owner'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'judge'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'judge'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'owner');

-- ───────── 시험용 만들기 도우미 ─────────

-- 모집 중(open)인 챌린지를 한 번에 만들어요 (초안 → 심사 요청 → 관리자 승인 → 공개). 목표 SDG 14, 심사위원 2명.
CREATE FUNCTION pg_temp.mk_challenge(p_id uuid, p_participation participation_kind DEFAULT 'both', p_max_team smallint DEFAULT NULL,
                                     p_status challenge_status DEFAULT 'open', p_judges boolean DEFAULT true) RETURNS uuid
  LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO challenges (id, company_id, created_by, title, summary, participation, max_team_size, created_at, opens_at, closes_at)
  VALUES (p_id, 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'テスト ' || left(p_id::text, 8), '要約',
          p_participation, p_max_team, now() - interval '2 days', now() - interval '2 days', now() + interval '10 days');
  INSERT INTO challenge_sdgs (challenge_id, position, sdg_id) VALUES (p_id, 1, 14);
  IF p_judges THEN
    INSERT INTO challenge_judges (challenge_id, company_id, user_id) VALUES
      (p_id, 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
      (p_id, 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003');
  END IF;
  IF p_status <> 'draft' THEN
    UPDATE challenges SET status = 'pending_review' WHERE id = p_id;
  END IF;
  IF p_status IN ('open', 'judging', 'closed') THEN
    UPDATE challenges SET status = 'open', approved_by = 'a0000000-0000-0000-0000-000000000001', approved_at = now() WHERE id = p_id;
  END IF;
  IF p_status IN ('judging', 'closed') THEN
    UPDATE challenges SET status = 'judging' WHERE id = p_id;
  END IF;
  IF p_status = 'closed' THEN
    UPDATE challenges SET status = 'closed' WHERE id = p_id;
  END IF;
  RETURN p_id;
END $$;

-- 제출 건 + 1번 버전(PDF)을 한꺼번에 넣어요 (제출 건은 반드시 파일이 있어야 하므로 같은 트랜잭션에서)
CREATE FUNCTION pg_temp.mk_proposal(p_id uuid, p_challenge uuid, p_student uuid, p_team uuid DEFAULT NULL) RETURNS uuid
  LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO proposals (id, challenge_id, submitter_id, team_id, team_name, title, summary)
  VALUES (p_id, p_challenge, p_student, p_team, 'チームA', '提案 ' || left(p_id::text, 8), '概要');
  INSERT INTO proposal_versions (proposal_id, file_key, file_name, mime_type, size_bytes, sha256)
  VALUES (p_id, 'files/' || p_id, 'plan.pdf', 'application/pdf', 1024, repeat('a', 64));
  RETURN p_id;
END $$;
