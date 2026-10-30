-- ============================================================================
-- SDGsコンパス — 데이터베이스 스키마 (PostgreSQL 16)
-- ----------------------------------------------------------------------------
-- 기능명세 SPEC-2026-SDGS-01 v1.0 의 기능 ID(F-101 ~ F-703)와 1:1 로 대응하도록 설계했어요.
-- 데모 앱(apps/web, apps/mobile)은 서버 없이 packages/data 의 샘플 데이터로 움직이고,
-- 이 스키마는 Phase 1~3 에서 서버(NestJS/FastAPI + PostgreSQL)가 같은 모양의 데이터를 돌려줄 때의 설계도예요.
-- 앱의 규칙(packages/core)과 DB 가 같은 값을 쓰도록 db/tests/ 에서 서로 맞춰 봐요.
--
-- 적용:   psql -v ON_ERROR_STOP=1 -f db/schema.sql -f db/seed.sql
-- 검증:   psql -v ON_ERROR_STOP=1 -f db/tests/smoke.sql   (규칙·제약·트리거를 실제로 시험해요)
-- 표기:   모든 PK 는 uuid (참조용 작은 표는 코드/번호), 시각은 timestamptz(UTC 저장, 표시는 앱이 JST/KST 로)
-- ============================================================================

-- 겹치는 면접 일정을 막는 제약(EXCLUDE)에 쓰는 확장 (PostgreSQL 에 기본 포함된 contrib)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ───────── 공용 함수 ─────────

-- 일본 표준시(JST) 기준 날짜. "하루 3건" 같은 일 단위 제한이 한국·일본 어디서 써도 같은 날로 세어지게 해요.
CREATE FUNCTION jst_date(ts timestamptz) RETURNS date
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT (ts AT TIME ZONE 'Asia/Tokyo')::date $$;

-- updated_at 자동 갱신
CREATE FUNCTION touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- 한 번 기록하면 바꾸거나 지울 수 없는 표(제출 버전·증명서·활동 기록)에 붙여요
CREATE FUNCTION forbid_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% 는 기록 후 수정·삭제할 수 없어요 (%)', TG_TABLE_NAME, TG_OP USING ERRCODE = 'restrict_violation';
END $$;

-- Impact 레벨: packages/core/src/impact.ts 의 LEVEL_THRESHOLDS [0, 300, 700, 1500, 2500] 와 같아요
CREATE FUNCTION impact_level(points integer) RETURNS smallint
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT (CASE WHEN points >= 2500 THEN 5 WHEN points >= 1500 THEN 4 WHEN points >= 700 THEN 3 WHEN points >= 300 THEN 2 ELSE 1 END)::smallint
  $$;

-- ───────── 열거형 ─────────

CREATE TYPE user_role          AS ENUM ('b2c', 'b2b', 'admin');
CREATE TYPE account_status     AS ENUM ('pending', 'active', 'suspended', 'blacklisted', 'deleted');
CREATE TYPE oauth_provider     AS ENUM ('google', 'kakao', 'apple');
CREATE TYPE locale_code        AS ENUM ('ja', 'ko');
CREATE TYPE visibility         AS ENUM ('private', 'scouts_only', 'public');
CREATE TYPE company_status     AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE member_role        AS ENUM ('owner', 'judge', 'staff');
CREATE TYPE review_status      AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE challenge_status   AS ENUM ('draft', 'pending_review', 'open', 'judging', 'closed', 'blinded');
CREATE TYPE participation_kind AS ENUM ('individual', 'team', 'both');
CREATE TYPE reward_kind        AS ENUM ('prize', 'internship', 'offer');
CREATE TYPE comment_kind       AS ENUM ('question', 'answer', 'comment');
CREATE TYPE request_status     AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE notif_kind         AS ENUM ('deadline_d7', 'deadline_d3', 'deadline_d1', 'review_result', 'scout', 'message', 'system');
CREATE TYPE notif_channel      AS ENUM ('push', 'kakao', 'sms', 'email', 'in_app');
CREATE TYPE proposal_status    AS ENUM ('submitted', 'reviewed', 'awarded', 'adopted', 'blinded', 'withdrawn');
CREATE TYPE verdict            AS ENUM ('pending', 'pass', 'fail');
CREATE TYPE award_kind         AS ENUM ('grand', 'excellence', 'special');
CREATE TYPE activity_kind      AS ENUM ('participation', 'submission', 'award', 'share');
CREATE TYPE share_template     AS ENUM ('instagram', 'linkedin');
CREATE TYPE scout_kind         AS ENUM ('internship', 'offer', 'interview');
CREATE TYPE scout_status       AS ENUM ('sent', 'read', 'accepted', 'declined', 'expired');
CREATE TYPE slot_status        AS ENUM ('proposed', 'confirmed', 'cancelled');
CREATE TYPE esg_category       AS ENUM ('E', 'S', 'G');
CREATE TYPE cert_unit          AS ENUM ('percent', 'yen', 'hours', 'flag');
CREATE TYPE cert_status        AS ENUM ('draft', 'submitted', 'granted', 'rejected');
CREATE TYPE report_target      AS ENUM ('challenge', 'proposal', 'comment', 'message', 'user');
CREATE TYPE report_reason      AS ENUM ('copyright', 'plagiarism', 'inappropriate', 'spam', 'other');
CREATE TYPE report_status      AS ENUM ('open', 'blinded', 'dismissed', 'deleted');
CREATE TYPE cert_kind          AS ENUM ('participation', 'award');
CREATE TYPE verify_result      AS ENUM ('valid', 'revoked', 'tampered', 'unknown');

-- ============================================================================
-- 1. 참조 데이터 (앱의 상수와 같은 값: db/seed.sql 이 packages/core 에서 만들어져요)
-- ============================================================================

-- UN SDGs 17 목표. 공식 로고·아이콘 이미지는 쓰지 않고 번호와 색만 써요.
CREATE TABLE sdgs (
  id        smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 17),
  color     char(7)  NOT NULL CHECK (color ~ '^#[0-9A-F]{6}$'),
  name_ja   text     NOT NULL,
  name_ko   text     NOT NULL,
  short_ja  text     NOT NULL,
  short_ko  text     NOT NULL
);

-- 스킬 태그 (F-102)
CREATE TABLE skills (
  code     text PRIMARY KEY CHECK (code ~ '^[a-z]+$'),
  name_ja  text NOT NULL,
  name_ko  text NOT NULL
);

-- 배지 정의 (F-402). 얻는 조건은 앱의 Impact 엔진(computeBadges)이 판단하고, 여기에는 이름만 둬요.
CREATE TABLE badges (
  code     text PRIMARY KEY CHECK (code ~ '^[A-Za-z]+$'),
  emoji    text NOT NULL,
  name_ja  text NOT NULL,
  name_ko  text NOT NULL,
  desc_ja  text NOT NULL,
  desc_ko  text NOT NULL
);

-- SDGs 인증마크 심사 항목 (certification.ts 의 CERT_CRITERIA)
CREATE TABLE cert_criteria (
  code       text PRIMARY KEY CHECK (code ~ '^[A-Za-z]+$'),
  category   esg_category NOT NULL,
  unit       cert_unit    NOT NULL,
  target     numeric      NOT NULL CHECK (target > 0),
  weight     smallint     NOT NULL CHECK (weight > 0),
  max_value  numeric      NOT NULL CHECK (max_value >= target)
);

-- ============================================================================
-- 2. 계정·프로필 (F-101 ~ F-104, F-701)
-- ============================================================================

CREATE TABLE users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text           NOT NULL CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  password_hash      text,                                   -- 소셜 로그인 전용 계정은 NULL
  role               user_role      NOT NULL,
  status             account_status NOT NULL DEFAULT 'pending',
  locale             locale_code    NOT NULL DEFAULT 'ja',   -- 앱 언어 선택 (첫 화면에서 고른 값)
  email_verified_at  timestamptz,
  last_login_at      timestamptz,
  created_at         timestamptz    NOT NULL DEFAULT now(),
  updated_at         timestamptz    NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);
-- F-101 이메일 중복 확인 (대소문자 무시, 탈퇴한 계정은 제외)
CREATE UNIQUE INDEX users_email_key ON users (lower(email)) WHERE deleted_at IS NULL;
CREATE TRIGGER users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- F-101 소셜 로그인 (Google/Kakao/Apple)
CREATE TABLE oauth_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider         oauth_provider NOT NULL,
  provider_user_id text           NOT NULL,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX oauth_accounts_user_idx ON oauth_accounts (user_id);

-- F-102 B2C 프로필
CREATE TABLE student_profiles (
  user_id              uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  nickname             text        NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 30),
  university_name      text,
  faculty              text,
  grad_year            smallint    CHECK (grad_year BETWEEN 2000 AND 2100),
  desired_job          text,
  bio                  text,
  avatar_key           text,                                 -- 파일 저장소(S3) 키
  identity_method      text        CHECK (identity_method IN ('mobile', 'pass')),  -- F-101 본인 확인
  identity_verified_at timestamptz,
  scoutable            boolean     NOT NULL DEFAULT true,    -- F-601 비공개 사용자는 인재 검색에서 제외
  portfolio_visibility visibility  NOT NULL DEFAULT 'scouts_only',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER student_profiles_touch BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- F-102 관심 SDGs: 1~17 중 최대 5개, 우선순위(1이 가장 중요)가 추천 가중치가 돼요
CREATE TABLE profile_sdg_interests (
  user_id  uuid     NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  sdg_id   smallint NOT NULL REFERENCES sdgs (id),
  priority smallint NOT NULL CHECK (priority BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, sdg_id),
  UNIQUE (user_id, priority)
);

CREATE TABLE profile_skills (
  user_id    uuid NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  skill_code text NOT NULL REFERENCES skills (code),
  PRIMARY KEY (user_id, skill_code)
);

-- F-103 기업(B2B) ESG 프로필 · 브랜드관
CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid           NOT NULL REFERENCES users (id),
  name            text           NOT NULL,
  business_number text,                                       -- 법인번호/사업자등록번호 (F-101 검증 대상)
  status          company_status NOT NULL DEFAULT 'pending',  -- F-701 승인 전에는 챌린지를 올릴 수 없어요
  approved_at     timestamptz,
  approved_by     uuid           REFERENCES users (id),
  industry        text,
  region          text,
  logo_key        text,
  homepage_url    text           CHECK (homepage_url IS NULL OR homepage_url ~* '^https?://'),
  about           text,
  source_lang     locale_code    NOT NULL DEFAULT 'ja',       -- about 등을 쓴 언어 (다른 언어는 content_translations)
  esg_goal        text,
  desired_talent  text,                                       -- 구하는 인재상
  hiring_perks    text,                                       -- 채용 연계 혜택
  contact_name    text,
  contact_email   text,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT companies_business_number_fmt CHECK (business_number IS NULL OR business_number ~ '^[0-9-]{10,15}$'),
  -- 승인됨이면 승인 일시가 있어야 하고, 대기·거절이면 없어야 해요 (정지된 기업은 예전 승인 기록을 그대로 둬요)
  CONSTRAINT companies_approval_consistent CHECK (CASE status WHEN 'approved' THEN approved_at IS NOT NULL WHEN 'suspended' THEN true ELSE approved_at IS NULL END)
);
CREATE UNIQUE INDEX companies_business_number_key ON companies (business_number) WHERE business_number IS NOT NULL;
CREATE INDEX companies_status_idx ON companies (status);
CREATE TRIGGER companies_touch BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 기업이 힘쓰는 SDGs
CREATE TABLE company_sdgs (
  company_id uuid     NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  sdg_id     smallint NOT NULL REFERENCES sdgs (id),
  PRIMARY KEY (company_id, sdg_id)
);

-- 기업 소속 담당자·심사위원 (F-303 의 심사위원은 여기서 지정해요)
CREATE TABLE company_members (
  company_id uuid        NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  member_role member_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);
CREATE INDEX company_members_user_idx ON company_members (user_id);

-- F-101 기업 인증 서류 (관리자가 서류 심사 후 승인: F-701)
CREATE TABLE company_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid          NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  doc_type      text          NOT NULL,
  file_key      text          NOT NULL,
  review_status review_status NOT NULL DEFAULT 'pending',
  reviewed_by   uuid          REFERENCES users (id),
  reviewed_at   timestamptz,
  review_note   text,
  uploaded_at   timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX company_documents_company_idx ON company_documents (company_id);

-- ============================================================================
-- 3. 챌린지 (F-201 ~ F-204)
-- ============================================================================

-- F-201 기업이 출제하는 SDGs 챌린지. 관리자가 승인(F-701)해야 공개돼요.
CREATE TABLE challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid               NOT NULL REFERENCES companies (id),
  created_by    uuid               NOT NULL REFERENCES users (id),
  title         text               NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  summary       text               NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 300),
  background    text,                                            -- 기업 브리핑(배경)
  mission       text,                                            -- 풀어 줬으면 하는 과제
  source_lang   locale_code        NOT NULL DEFAULT 'ja',        -- 쓴 언어 (다른 언어는 content_translations)
  status        challenge_status   NOT NULL DEFAULT 'draft',
  participation participation_kind NOT NULL DEFAULT 'both',
  max_team_size smallint           CHECK (max_team_size BETWEEN 2 AND 10),
  impact_points smallint           NOT NULL DEFAULT 120 CHECK (impact_points BETWEEN 0 AND 1000),  -- 제출 시 얻는 기본 Impact 포인트
  cover_hue     smallint           NOT NULL DEFAULT 200 CHECK (cover_hue BETWEEN 0 AND 360),       -- 표지 그라데이션 색상
  opens_at      timestamptz        NOT NULL DEFAULT now(),
  closes_at     timestamptz        NOT NULL,
  approved_by   uuid               REFERENCES users (id),
  approved_at   timestamptz,
  created_at    timestamptz        NOT NULL DEFAULT now(),
  updated_at    timestamptz        NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),                                       -- 아래 표들이 "같은 기업의 챌린지"임을 복합 FK 로 보장
  -- F-201 마감은 만든 날부터 최소 7일 (packages/core MIN_CHALLENGE_DAYS) ~ 최대 90일 (MAX_CHALLENGE_DAYS)
  CONSTRAINT challenges_deadline_window CHECK (closes_at - created_at BETWEEN interval '7 days' AND interval '90 days'),
  CONSTRAINT challenges_period          CHECK (closes_at > opens_at),
  CONSTRAINT challenges_individual_size CHECK (participation <> 'individual' OR max_team_size IS NULL),
  -- F-701 승인(관리자) 없이는 공개 상태가 될 수 없어요
  CONSTRAINT challenges_approved_before_open CHECK (status IN ('draft', 'pending_review') OR (approved_at IS NOT NULL AND approved_by IS NOT NULL))
);
CREATE INDEX challenges_company_idx ON challenges (company_id);
CREATE INDEX challenges_open_idx    ON challenges (closes_at) WHERE status = 'open';
CREATE TRIGGER challenges_touch BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- F-202 17개 SDGs 필터 — 챌린지당 최대 3개 (packages/core MAX_CHALLENGE_SDGS)
-- position(1~3)을 PK 에 넣어서 "최대 3개"를 CHECK 하나로 보장해요.
CREATE TABLE challenge_sdgs (
  challenge_id uuid     NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  position     smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  sdg_id       smallint NOT NULL REFERENCES sdgs (id),
  PRIMARY KEY (challenge_id, position),
  UNIQUE (challenge_id, sdg_id)
);
CREATE INDEX challenge_sdgs_sdg_idx ON challenge_sdgs (sdg_id);

-- F-202 AI 추천 피드가 쓰는 "구하는 스킬"
CREATE TABLE challenge_skills (
  challenge_id uuid NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  skill_code   text NOT NULL REFERENCES skills (code),
  PRIMARY KEY (challenge_id, skill_code)
);

-- F-201 제출물 안내 (예: 기획서 PDF·PPTX, 영상 URL)
CREATE TABLE challenge_deliverables (
  challenge_id uuid     NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  position     smallint NOT NULL CHECK (position BETWEEN 1 AND 10),
  body         text     NOT NULL CHECK (char_length(btrim(body)) > 0),
  PRIMARY KEY (challenge_id, position)
);

-- F-201 보상: 상금 / 인턴십 / 채용 제안 (상금만 금액을 가져요)
CREATE TABLE challenge_rewards (
  challenge_id uuid        NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  kind         reward_kind NOT NULL,
  amount_yen   integer     CHECK (amount_yen > 0),
  note         text,
  PRIMARY KEY (challenge_id, kind),
  CONSTRAINT rewards_prize_has_amount CHECK ((kind = 'prize') = (amount_yen IS NOT NULL))
);

-- F-201 첨부 자료 (브리핑 PDF 등)
CREATE TABLE challenge_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid        NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  file_key     text        NOT NULL,
  file_name    text        NOT NULL,
  size_bytes   bigint      NOT NULL CHECK (size_bytes BETWEEN 1 AND 52428800),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenge_attachments_challenge_idx ON challenge_attachments (challenge_id);

-- F-303 심사위원: 챌린지를 낸 기업의 구성원만 지정할 수 있어요 (복합 FK 두 개로 보장)
CREATE TABLE challenge_judges (
  challenge_id uuid        NOT NULL,
  company_id   uuid        NOT NULL,
  user_id      uuid        NOT NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id),
  FOREIGN KEY (challenge_id, company_id) REFERENCES challenges (id, company_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, user_id)      REFERENCES company_members (company_id, user_id) ON DELETE CASCADE
);

-- F-203 Q&A 게시판: 질문(question)에 기업이 답변(answer)을 달아요. 답변은 반드시 같은 챌린지의 글에 붙어요.
CREATE TABLE challenge_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid         NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  parent_id    uuid,
  author_id    uuid         NOT NULL REFERENCES users (id),
  kind         comment_kind NOT NULL,
  body         text         NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  source_lang  locale_code  NOT NULL DEFAULT 'ja',
  blinded_at   timestamptz,                                   -- F-702 블라인드
  created_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (id, challenge_id),
  FOREIGN KEY (parent_id, challenge_id) REFERENCES challenge_comments (id, challenge_id) ON DELETE CASCADE,
  CONSTRAINT comments_answer_has_parent CHECK ((kind = 'answer') = (parent_id IS NOT NULL))
);
CREATE INDEX challenge_comments_challenge_idx ON challenge_comments (challenge_id, created_at);

-- 챌린지 상태 전이 규칙 (draft → pending_review → open → judging → closed, 그리고 F-702 blinded)
CREATE FUNCTION challenge_status_can_change(old_status challenge_status, new_status challenge_status) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT old_status = new_status OR (old_status, new_status) IN (
      ('draft', 'pending_review'),
      ('pending_review', 'draft'),
      ('pending_review', 'open'),
      ('open', 'judging'),
      ('judging', 'closed'),
      ('open', 'blinded'),
      ('judging', 'blinded'),
      ('closed', 'blinded'),
      ('blinded', 'closed')
    )
  $$;

CREATE FUNCTION challenges_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  company_state company_status;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- F-103/F-701 승인 전 기업은 챌린지를 만들 수 없어요. 새 챌린지는 초안(또는 승인 요청)으로만 시작해요.
    SELECT status INTO company_state FROM companies WHERE id = NEW.company_id;
    IF company_state IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION '승인된 기업만 챌린지를 출제할 수 있어요 (company %, status %)', NEW.company_id, company_state
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status NOT IN ('draft', 'pending_review') THEN
      RAISE EXCEPTION '새 챌린지는 draft 또는 pending_review 로만 만들 수 있어요 (%)', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT challenge_status_can_change(OLD.status, NEW.status) THEN
    RAISE EXCEPTION '챌린지 상태를 % → % 로 바꿀 수 없어요', OLD.status, NEW.status USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- 심사 요청·공개 전에는 목표 SDGs 가 1개 이상 있어야 해요 (F-201/F-202)
    IF NEW.status IN ('pending_review', 'open') AND NOT EXISTS (SELECT 1 FROM challenge_sdgs WHERE challenge_id = NEW.id) THEN
      RAISE EXCEPTION '목표 SDGs 를 1개 이상 고른 뒤에 심사를 요청할 수 있어요' USING ERRCODE = 'check_violation';
    END IF;
    -- 심사 단계로 넘어가려면 심사위원이 지정돼 있어야 해요 (F-303)
    IF NEW.status = 'judging' AND NOT EXISTS (SELECT 1 FROM challenge_judges WHERE challenge_id = NEW.id) THEN
      RAISE EXCEPTION '심사위원을 지정한 뒤에 심사를 시작할 수 있어요' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER challenges_guard_ins BEFORE INSERT ON challenges FOR EACH ROW EXECUTE FUNCTION challenges_guard();
CREATE TRIGGER challenges_guard_upd BEFORE UPDATE OF status ON challenges FOR EACH ROW EXECUTE FUNCTION challenges_guard();

-- F-203 팀 빌딩 게시판 ("이런 역할의 팀원을 찾아요")
CREATE TABLE team_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid        NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  author_id    uuid        NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  title        text        NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  body         text        NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  source_lang  locale_code NOT NULL DEFAULT 'ja',
  closed_at    timestamptz,                                   -- 모집 마감
  blinded_at   timestamptz,                                   -- F-702
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, challenge_id)
);
CREATE INDEX team_posts_challenge_idx ON team_posts (challenge_id, created_at DESC);

CREATE TABLE team_post_roles (
  post_id    uuid NOT NULL REFERENCES team_posts (id) ON DELETE CASCADE,
  skill_code text NOT NULL REFERENCES skills (code),
  PRIMARY KEY (post_id, skill_code)
);

-- F-203 "함께하고 싶어요" 요청
CREATE TABLE team_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid           NOT NULL REFERENCES team_posts (id) ON DELETE CASCADE,
  requester_id uuid           NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  message      text           CHECK (char_length(message) <= 500),
  status       request_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz    NOT NULL DEFAULT now(),
  decided_at   timestamptz,
  UNIQUE (post_id, requester_id),
  -- 수락·거절은 결정 시각이 있어야 하고, 대기 중인 요청에는 없어야 해요 (취소는 어느 쪽이든 괜찮아요)
  CONSTRAINT team_requests_decided CHECK (status = 'cancelled' OR ((status = 'pending') = (decided_at IS NULL)))
);

CREATE FUNCTION team_requests_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM team_posts WHERE id = NEW.post_id AND author_id = NEW.requester_id) THEN
    RAISE EXCEPTION '자기 글에는 참여 요청을 보낼 수 없어요' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER team_requests_guard_ins BEFORE INSERT ON team_requests FOR EACH ROW EXECUTE FUNCTION team_requests_guard();

-- 확정된 팀. 한 사람은 한 챌린지에 한 팀에만 들어갈 수 있어요.
CREATE TABLE teams (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id   uuid        NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  name           text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 30),
  leader_id      uuid        NOT NULL REFERENCES student_profiles (user_id),
  source_post_id uuid        REFERENCES team_posts (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, challenge_id)
);
CREATE INDEX teams_challenge_idx ON teams (challenge_id);

CREATE TABLE team_members (
  team_id      uuid        NOT NULL,
  challenge_id uuid        NOT NULL,
  user_id      uuid        NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id),
  UNIQUE (challenge_id, user_id),
  FOREIGN KEY (team_id, challenge_id) REFERENCES teams (id, challenge_id) ON DELETE CASCADE
);

-- 팀 인원은 챌린지가 정한 최대 인원을 넘을 수 없고, 개인 전용 챌린지에는 팀을 만들 수 없어요 (F-203)
CREATE FUNCTION team_members_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  c challenges%ROWTYPE;
  current_size integer;
BEGIN
  SELECT * INTO c FROM challenges WHERE id = NEW.challenge_id;
  IF c.participation = 'individual' THEN
    RAISE EXCEPTION '개인 참가 전용 챌린지에는 팀을 만들 수 없어요' USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO current_size FROM team_members WHERE team_id = NEW.team_id;
  IF c.max_team_size IS NOT NULL AND current_size + 1 > c.max_team_size THEN
    RAISE EXCEPTION '팀 인원은 최대 %명이에요', c.max_team_size USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER team_members_guard_ins BEFORE INSERT ON team_members FOR EACH ROW EXECUTE FUNCTION team_members_guard();

-- F-204 관심 챌린지(북마크)
CREATE TABLE bookmarks (
  user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  challenge_id uuid        NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);
CREATE INDEX bookmarks_challenge_idx ON bookmarks (challenge_id);

-- F-204 알림 설정: 알림 종류 × 채널(푸시·카카오·SMS·이메일·앱 안) 별로 켜고 끄기
CREATE TABLE notification_prefs (
  user_id uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind    notif_kind    NOT NULL,
  channel notif_channel NOT NULL,
  enabled boolean       NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, kind, channel)
);

-- 푸시 알림을 보낼 기기
CREATE TABLE device_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  platform   text        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);
CREATE INDEX device_tokens_user_idx ON device_tokens (user_id);

-- F-204 보낸(또는 보낼) 알림. 마감 D-7/D-3/D-1 알림은 사람·챌린지·채널별로 한 번만 만들어져요.
CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind         notif_kind    NOT NULL,
  channel      notif_channel NOT NULL DEFAULT 'in_app',
  challenge_id uuid          REFERENCES challenges (id) ON DELETE CASCADE,
  title        text          NOT NULL,
  body         text,
  link         text,
  scheduled_at timestamptz   NOT NULL DEFAULT now(),
  sent_at      timestamptz,
  read_at      timestamptz,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT notifications_deadline_needs_challenge CHECK (kind NOT IN ('deadline_d7', 'deadline_d3', 'deadline_d1') OR challenge_id IS NOT NULL)
);
CREATE UNIQUE INDEX notifications_deadline_once ON notifications (user_id, challenge_id, kind, channel)
  WHERE kind IN ('deadline_d7', 'deadline_d3', 'deadline_d1');
CREATE INDEX notifications_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX notifications_due_idx ON notifications (scheduled_at) WHERE sent_at IS NULL;

-- ============================================================================
-- 4. 기획서 제출 · 심사 · 수상 · 매칭 (F-301 ~ F-303, 수익 모델)
-- ============================================================================

-- F-301 제출 수령증 번호 SC-YYYYMMDD-NNNN — 날짜(JST)마다 0001 부터 세요. 동시에 제출해도 번호가 겹치지 않아요.
CREATE TABLE receipt_counters (
  day     date    PRIMARY KEY,
  last_no integer NOT NULL CHECK (last_no BETWEEN 1 AND 9999)
);

CREATE FUNCTION issue_receipt_no(at timestamptz DEFAULT now()) RETURNS text
  LANGUAGE plpgsql AS $$
DECLARE
  d date := jst_date(at);
  n integer;
BEGIN
  INSERT INTO receipt_counters AS rc (day, last_no) VALUES (d, 1)
    ON CONFLICT (day) DO UPDATE SET last_no = rc.last_no + 1
    RETURNING rc.last_no INTO n;
  RETURN 'SC-' || to_char(d, 'YYYYMMDD') || '-' || lpad(n::text, 4, '0');
END $$;

-- 제출 상태 전이: submitted → reviewed → awarded → adopted (+ 철회 withdrawn, F-702 blinded)
CREATE FUNCTION proposal_status_can_change(old_status proposal_status, new_status proposal_status) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT old_status = new_status OR (old_status, new_status) IN (
      ('submitted', 'reviewed'),
      ('submitted', 'withdrawn'),
      ('reviewed',  'awarded'),
      ('reviewed',  'adopted'),
      ('awarded',   'adopted'),
      ('submitted', 'blinded'),
      ('reviewed',  'blinded'),
      ('awarded',   'blinded'),
      ('adopted',   'blinded')
    )
  $$;

-- F-301 기획서 제출 (한 사람/팀이 한 챌린지에 한 건. 다시 내면 새 "버전"이 쌓여요: F-302)
CREATE TABLE proposals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid            NOT NULL REFERENCES challenges (id),
  submitter_id uuid            NOT NULL REFERENCES student_profiles (user_id),
  team_id      uuid,
  team_name    text            NOT NULL CHECK (char_length(btrim(team_name)) BETWEEN 1 AND 30),     -- packages/core LIMITS.teamName
  title        text            NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),         -- LIMITS.title
  summary      text            NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 300),      -- LIMITS.summary
  video_url    text            CHECK (video_url IS NULL OR video_url ~* '^https://[^[:space:]/]+\.[^[:space:]/]+(/[^[:space:]]*)?$'),
  receipt_no   text            NOT NULL UNIQUE CHECK (receipt_no ~ '^SC-[0-9]{8}-[0-9]{4}$'),
  status       proposal_status NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz     NOT NULL DEFAULT now(),
  updated_at   timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (id, challenge_id),
  UNIQUE (challenge_id, submitter_id),
  FOREIGN KEY (team_id, challenge_id) REFERENCES teams (id, challenge_id)
);
CREATE UNIQUE INDEX proposals_one_per_team ON proposals (challenge_id, team_id) WHERE team_id IS NOT NULL;
CREATE INDEX proposals_submitter_idx ON proposals (submitter_id);
CREATE TRIGGER proposals_touch BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE FUNCTION proposals_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  c challenges%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT proposal_status_can_change(OLD.status, NEW.status) THEN
      RAISE EXCEPTION '제출 상태를 % → % 로 바꿀 수 없어요', OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  SELECT * INTO c FROM challenges WHERE id = NEW.challenge_id;
  IF c.status <> 'open' OR NEW.submitted_at > c.closes_at THEN
    RAISE EXCEPTION '모집이 끝났거나 열리지 않은 챌린지에는 제출할 수 없어요 (%)', c.status USING ERRCODE = 'check_violation';
  END IF;
  IF c.participation = 'team' AND NEW.team_id IS NULL THEN
    RAISE EXCEPTION '팀 전용 챌린지예요 — 팀으로 제출해 주세요' USING ERRCODE = 'check_violation';
  END IF;
  IF c.participation = 'individual' AND NEW.team_id IS NOT NULL THEN
    RAISE EXCEPTION '개인 전용 챌린지예요 — 팀으로는 제출할 수 없어요' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = NEW.team_id AND user_id = NEW.submitter_id) THEN
    RAISE EXCEPTION '팀 구성원만 팀 제출을 할 수 있어요' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.receipt_no IS NULL THEN
    NEW.receipt_no := issue_receipt_no(NEW.submitted_at);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proposals_guard_ins BEFORE INSERT ON proposals FOR EACH ROW EXECUTE FUNCTION proposals_guard();
CREATE TRIGGER proposals_guard_upd BEFORE UPDATE OF status ON proposals FOR EACH ROW EXECUTE FUNCTION proposals_guard();

-- F-302 제출 버전: 마감 전까지 새 버전을 쌓을 수 있고, 한 번 기록한 버전은 고칠 수 없어요 (파일 지문 SHA-256 포함)
CREATE TABLE proposal_versions (
  proposal_id   uuid        NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  version_no    smallint    NOT NULL CHECK (version_no >= 1),
  file_key      text        NOT NULL,
  file_name     text        NOT NULL CHECK (lower(file_name) ~ '\.(pdf|pptx)$'),                -- LIMITS/ALLOWED_EXTENSIONS: pdf, pptx
  mime_type     text        NOT NULL CHECK (mime_type IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')),
  size_bytes    bigint      NOT NULL CHECK (size_bytes BETWEEN 1 AND 52428800),                 -- 50MB (LIMITS.fileBytes)
  sha256        char(64)    NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  change_reason text,                                            -- 2번째 버전부터 앱이 사유를 받아요
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, version_no),
  CONSTRAINT proposal_versions_mime_matches_ext CHECK ((mime_type = 'application/pdf') = (lower(file_name) ~ '\.pdf$'))
);

CREATE FUNCTION proposal_versions_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  c challenges%ROWTYPE;
  expected smallint;
BEGIN
  SELECT ch.* INTO c FROM proposals p JOIN challenges ch ON ch.id = p.challenge_id WHERE p.id = NEW.proposal_id;
  IF c.status <> 'open' OR NEW.submitted_at > c.closes_at THEN
    RAISE EXCEPTION '마감 뒤에는 새 버전을 낼 수 없어요 (F-302)' USING ERRCODE = 'check_violation';
  END IF;
  SELECT COALESCE(max(version_no), 0) + 1 INTO expected FROM proposal_versions WHERE proposal_id = NEW.proposal_id;
  IF NEW.version_no IS NULL THEN
    NEW.version_no := expected;
  ELSIF NEW.version_no <> expected THEN
    RAISE EXCEPTION '버전 번호는 % 이어야 해요 (건너뛸 수 없어요)', expected USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proposal_versions_guard_ins BEFORE INSERT ON proposal_versions FOR EACH ROW EXECUTE FUNCTION proposal_versions_guard();
CREATE TRIGGER proposal_versions_immutable BEFORE UPDATE ON proposal_versions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 제출 건에는 반드시 1번 버전(파일)이 있어야 해요 — 트랜잭션이 끝날 때 확인해요 (제출 건과 1번 버전을 같은 트랜잭션에서 넣어요)
CREATE FUNCTION proposals_require_first_version() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM proposal_versions WHERE proposal_id = NEW.id) THEN
    RAISE EXCEPTION '제출 건 % 에 파일(버전 1)이 없어요', NEW.receipt_no USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER proposals_has_version AFTER INSERT ON proposals
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION proposals_require_first_version();

-- 심사 화면·기업 대시보드용: 제출 건 + 가장 최신 버전
CREATE VIEW proposal_current AS
  SELECT DISTINCT ON (p.id)
         p.id, p.challenge_id, p.submitter_id, p.team_id, p.team_name, p.title, p.summary, p.video_url,
         p.receipt_no, p.status, p.submitted_at AS first_submitted_at,
         v.version_no AS current_version, v.file_name, v.size_bytes, v.sha256, v.submitted_at AS version_submitted_at
    FROM proposals p
    JOIN proposal_versions v ON v.proposal_id = p.id
   ORDER BY p.id, v.version_no DESC;

-- F-303 심사 점수 (창의성·실현가능성·SDGs 기여도 각 1~5점). 해당 챌린지에 지정된 심사위원만, 심사 단계에서만 쓸 수 있어요.
CREATE TABLE reviews (
  proposal_id      uuid        NOT NULL,
  challenge_id     uuid        NOT NULL,
  judge_id         uuid        NOT NULL,
  creativity       smallint    NOT NULL CHECK (creativity BETWEEN 1 AND 5),
  feasibility      smallint    NOT NULL CHECK (feasibility BETWEEN 1 AND 5),
  sdg_contribution smallint    NOT NULL CHECK (sdg_contribution BETWEEN 1 AND 5),
  average          numeric(3,2) GENERATED ALWAYS AS (round((creativity + feasibility + sdg_contribution) / 3.0, 2)) STORED,
  comment          text,
  reviewed_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, judge_id),
  FOREIGN KEY (proposal_id, challenge_id) REFERENCES proposals (id, challenge_id) ON DELETE CASCADE,
  FOREIGN KEY (challenge_id, judge_id)    REFERENCES challenge_judges (challenge_id, user_id)
);
CREATE INDEX reviews_challenge_idx ON reviews (challenge_id);

CREATE FUNCTION reviews_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT status FROM challenges WHERE id = NEW.challenge_id) <> 'judging' THEN
    RAISE EXCEPTION '심사 단계(judging)인 챌린지에서만 점수를 줄 수 있어요' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reviews_guard_ins BEFORE INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION reviews_guard();

-- 첫 심사 점수가 들어오면 제출 건이 "심사 중(reviewed)"이 돼요
CREATE FUNCTION reviews_mark_reviewed() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  UPDATE proposals SET status = 'reviewed' WHERE id = NEW.proposal_id AND status = 'submitted';
  RETURN NULL;
END $$;
CREATE TRIGGER reviews_mark_reviewed_ins AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION reviews_mark_reviewed();

-- 수상. 한 챌린지에 대상(grand)은 1건, 포인트는 종류로 정해져요 (AWARD_POINTS: grand 400 · excellence 300 · special 200)
CREATE TABLE awards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  uuid        NOT NULL UNIQUE,
  challenge_id uuid        NOT NULL,
  kind         award_kind  NOT NULL,
  points       smallint    GENERATED ALWAYS AS (CASE kind WHEN 'grand' THEN 400 WHEN 'excellence' THEN 300 ELSE 200 END) STORED,
  awarded_by   uuid        NOT NULL REFERENCES users (id),
  awarded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, points),
  FOREIGN KEY (proposal_id, challenge_id) REFERENCES proposals (id, challenge_id)
);
CREATE UNIQUE INDEX awards_one_grand_per_challenge ON awards (challenge_id) WHERE kind = 'grand';

-- F-303 심사위원 전원이 점수를 준 뒤에만 수상을 확정할 수 있어요
CREATE FUNCTION awards_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  judges integer;
  done   integer;
BEGIN
  IF (SELECT status FROM challenges WHERE id = NEW.challenge_id) <> 'judging' THEN
    RAISE EXCEPTION '심사 단계(judging)에서만 수상을 확정할 수 있어요' USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO judges FROM challenge_judges WHERE challenge_id = NEW.challenge_id;
  SELECT count(*) INTO done   FROM reviews          WHERE proposal_id  = NEW.proposal_id;
  IF judges = 0 OR done < judges THEN
    RAISE EXCEPTION '심사위원 %명 중 %명만 점수를 줬어요 — 전원 완료 후에 확정할 수 있어요 (F-303)', judges, done USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER awards_guard_ins BEFORE INSERT ON awards FOR EACH ROW EXECUTE FUNCTION awards_guard();

CREATE FUNCTION awards_mark_awarded() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  UPDATE proposals SET status = 'awarded' WHERE id = NEW.proposal_id AND status = 'reviewed';
  RETURN NULL;
END $$;
CREATE TRIGGER awards_mark_awarded_ins AFTER INSERT ON awards FOR EACH ROW EXECUTE FUNCTION awards_mark_awarded();

-- 기업이 제안을 채용(사업 시작)하면 매칭이 성립하고 중개 수수료가 생겨요.
-- 수수료 ¥30,000 (MATCH_FEE_YEN) 중 50% (DONATION_RATIO)는 기업 이름으로 SDGs 활동에 기부, 나머지가 운영 수익이에요.
CREATE TABLE matches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid        NOT NULL,
  company_id   uuid        NOT NULL,
  proposal_id  uuid        NOT NULL UNIQUE,
  adopted_by   uuid        NOT NULL REFERENCES users (id),
  fee_yen      integer     NOT NULL DEFAULT 30000 CHECK (fee_yen > 0),
  donation_yen integer     GENERATED ALWAYS AS (fee_yen / 2) STORED,              -- 내림 (splitMatchFee)
  revenue_yen  integer     GENERATED ALWAYS AS (fee_yen - fee_yen / 2) STORED,
  matched_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, donation_yen),
  FOREIGN KEY (proposal_id, challenge_id) REFERENCES proposals (id, challenge_id),
  FOREIGN KEY (challenge_id, company_id)  REFERENCES challenges (id, company_id)
);
CREATE INDEX matches_company_idx ON matches (company_id, matched_at DESC);

CREATE FUNCTION matches_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  state proposal_status;
BEGIN
  SELECT status INTO state FROM proposals WHERE id = NEW.proposal_id;
  IF state = 'adopted' THEN
    RAISE EXCEPTION '이미 채용된 제안이에요' USING ERRCODE = 'check_violation';
  ELSIF state NOT IN ('reviewed', 'awarded') THEN
    RAISE EXCEPTION '심사를 마친 제안만 채용할 수 있어요 (현재 %)', state USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER matches_guard_ins BEFORE INSERT ON matches FOR EACH ROW EXECUTE FUNCTION matches_guard();

CREATE FUNCTION matches_mark_adopted() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  UPDATE proposals SET status = 'adopted' WHERE id = NEW.proposal_id;
  RETURN NULL;
END $$;
CREATE TRIGGER matches_mark_adopted_ins AFTER INSERT ON matches FOR EACH ROW EXECUTE FUNCTION matches_mark_adopted();

-- 기부처 (예: 海洋保全NPO). 이름은 일본어/한국어 둘 다 가져요.
CREATE TABLE donation_recipients (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ja  text    NOT NULL,
  name_ko  text    NOT NULL,
  sdg_id   smallint REFERENCES sdgs (id),
  url      text    CHECK (url IS NULL OR url ~* '^https?://'),
  active   boolean NOT NULL DEFAULT true
);

-- 기업 이름으로 한 기부. 금액은 매칭의 기부액과 반드시 같아요 (복합 FK 로 보장).
CREATE TABLE donations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid        NOT NULL UNIQUE,
  amount_yen   integer     NOT NULL,
  recipient_id uuid        NOT NULL REFERENCES donation_recipients (id),
  receipt_key  text,                                             -- 기부 영수증 파일
  donated_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (match_id, amount_yen) REFERENCES matches (id, donation_yen)
);

-- ============================================================================
-- 5. SNS 카드뉴스 · 활동 · Impact Index · 포트폴리오 · 디지털 증명서 (F-104, F-401, F-402, F-501, F-502)
-- ============================================================================

-- F-501 카드뉴스: 수상·참가 실적을 인스타그램(1:1)·링크드인(1.91:1) 규격 이미지로 자동 생성
CREATE TABLE share_cards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid           NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  challenge_id uuid           REFERENCES challenges (id) ON DELETE SET NULL,
  award_id     uuid           REFERENCES awards (id) ON DELETE SET NULL,
  template     share_template NOT NULL,
  headline     text           NOT NULL CHECK (char_length(btrim(headline)) BETWEEN 1 AND 120),
  image_key    text,                                              -- 생성된 이미지 (S3)
  created_at   timestamptz    NOT NULL DEFAULT now(),
  shared_at    timestamptz                                        -- 사용자가 공유·저장을 누른 시각
);
CREATE INDEX share_cards_user_idx ON share_cards (user_id, created_at DESC);

-- F-401 Impact Index 의 재료: 참가·제출·수상·공유 기록 (한 번 기록하면 고칠 수 없어요)
CREATE TABLE activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid          NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  kind          activity_kind NOT NULL,
  challenge_id  uuid          REFERENCES challenges (id),
  proposal_id   uuid          REFERENCES proposals (id),
  award_id      uuid,
  share_card_id uuid          REFERENCES share_cards (id),
  title         text          NOT NULL,                             -- 기록 당시의 챌린지 이름 (나중에 바뀌어도 증명서가 달라지지 않게)
  company_name  text          NOT NULL,
  points        integer       NOT NULL CHECK (points >= 0),
  occurred_on   date          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  -- 수상 활동의 포인트는 수상 종류의 포인트와 같아야 해요 (award_id 가 NULL 이면 검사하지 않아요)
  FOREIGN KEY (award_id, points) REFERENCES awards (id, points),
  CONSTRAINT activities_kind_refs CHECK (
    CASE kind
      WHEN 'participation' THEN challenge_id IS NOT NULL AND points = 50             -- PARTICIPATION_POINTS
      WHEN 'submission'    THEN proposal_id IS NOT NULL
      WHEN 'award'         THEN award_id IS NOT NULL
      WHEN 'share'         THEN share_card_id IS NOT NULL AND points IN (0, 10)      -- SHARE_POINTS
    END
  )
);
CREATE INDEX activities_user_idx ON activities (user_id, occurred_on DESC);

-- 공유로 쌓이는 포인트는 최대 5번까지 (MAX_SHARE_ACTIVITIES) — 그 뒤의 공유 기록은 0점이에요
CREATE FUNCTION activities_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  earlier integer;
BEGIN
  IF NEW.kind = 'share' THEN
    SELECT count(*) INTO earlier FROM activities WHERE user_id = NEW.user_id AND kind = 'share';
    NEW.points := CASE WHEN earlier < 5 THEN 10 ELSE 0 END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER activities_guard_ins BEFORE INSERT ON activities FOR EACH ROW EXECUTE FUNCTION activities_guard();
CREATE TRIGGER activities_immutable BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 활동이 닿은 SDGs (포인트가 SDG 마다 쌓여 레이더 차트가 돼요)
CREATE TABLE activity_sdgs (
  activity_id uuid     NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  sdg_id      smallint NOT NULL REFERENCES sdgs (id),
  PRIMARY KEY (activity_id, sdg_id)
);
CREATE INDEX activity_sdgs_sdg_idx ON activity_sdgs (sdg_id);

-- SDG 점수(0~100) = 100 × (1 − e^(−누적 포인트 / 300))  (packages/core SDG_SATURATION)
CREATE FUNCTION impact_sdg_score(raw_points integer) RETURNS smallint
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT round(100 * (1 - exp(-raw_points / 300.0)))::smallint $$;

-- F-401 SDG 별 누적 포인트와 점수 — activity_sdgs 에 행이 들어올 때마다 자동으로 쌓여요
CREATE TABLE impact_scores (
  user_id    uuid        NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  sdg_id     smallint    NOT NULL REFERENCES sdgs (id),
  raw_points integer     NOT NULL DEFAULT 0 CHECK (raw_points >= 0),
  score      smallint    GENERATED ALWAYS AS (impact_sdg_score(raw_points)) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sdg_id)
);

CREATE FUNCTION activity_sdgs_accumulate() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  a activities%ROWTYPE;
BEGIN
  SELECT * INTO a FROM activities WHERE id = NEW.activity_id;
  INSERT INTO impact_scores AS s (user_id, sdg_id, raw_points) VALUES (a.user_id, NEW.sdg_id, a.points)
    ON CONFLICT (user_id, sdg_id) DO UPDATE SET raw_points = s.raw_points + EXCLUDED.raw_points, updated_at = now();
  RETURN NULL;
END $$;
CREATE TRIGGER activity_sdgs_accumulate_ins AFTER INSERT ON activity_sdgs FOR EACH ROW EXECUTE FUNCTION activity_sdgs_accumulate();

-- F-401 누적 포인트와 레벨 (활동이 없는 사람도 Lv.1 로 나와요)
CREATE VIEW impact_totals AS
  SELECT sp.user_id,
         COALESCE(sum(a.points), 0)::integer AS total_points,
         impact_level(COALESCE(sum(a.points), 0)::integer) AS level
    FROM student_profiles sp
    LEFT JOIN activities a ON a.user_id = sp.user_id
   GROUP BY sp.user_id;

-- F-402 획득한 배지 (조건 판정은 Impact 엔진이 하고, 얻은 기록만 남겨요)
CREATE TABLE user_badges (
  user_id    uuid        NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  badge_code text        NOT NULL REFERENCES badges (code),
  earned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

-- F-104 포트폴리오: 직접 올린 PDF 또는 외부 URL (자동 생성 PDF 는 활동 기록에서 그때그때 만들어요)
CREATE TABLE portfolio_files (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  kind       text        NOT NULL CHECK (kind IN ('pdf', 'url')),
  title      text        NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  file_key   text,
  url        text        CHECK (url IS NULL OR url ~* '^https?://'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_files_kind_fields CHECK ((kind = 'pdf') = (file_key IS NOT NULL) AND (kind = 'url') = (url IS NOT NULL))
);
CREATE INDEX portfolio_files_user_idx ON portfolio_files (user_id);

-- F-502 디지털 증명서 ─────────────────────────────────────────────────────────
-- 내용을 SHA-256 으로 해시해 두고, 나중에 내용을 다시 해시해 맞춰 보면 위·변조를 바로 알 수 있어요.
-- 해시를 만드는 글자열은 packages/core 의 certificatePayload() 와 한 글자도 다르지 않게 만들어요 (db/tests/golden.sql 로 대조).
CREATE FUNCTION certificate_payload(p_serial text, p_kind cert_kind, p_holder text, p_title text, p_company text,
                                    p_award award_kind, p_sdgs smallint[], p_points integer, p_issued date) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT '["SDGS-COMPASS-CERT/1",' || to_json(p_serial)::text
        || ',' || to_json(p_kind::text)::text
        || ',' || to_json(p_holder)::text
        || ',' || to_json(p_title)::text
        || ',' || to_json(p_company)::text
        || ',' || COALESCE(to_json(p_award::text)::text, 'null')
        || ',' || array_to_json(p_sdgs)::text
        || ',' || p_points::text
        || ',' || to_json(to_char(p_issued::timestamp, 'YYYY-MM-DD'))::text
        || ']'
  $$;

CREATE FUNCTION certificate_hash(p_payload text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT encode(sha256(convert_to(p_payload, 'UTF8')), 'hex') $$;

CREATE TABLE certificates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no       text        NOT NULL UNIQUE CHECK (serial_no ~ '^SC-C-[0-9]{4,}$'),
  user_id         uuid        NOT NULL REFERENCES student_profiles (user_id),
  activity_id     uuid        UNIQUE REFERENCES activities (id),     -- 한 활동에 증명서 한 장
  kind            cert_kind   NOT NULL,
  holder_name     text        NOT NULL,
  challenge_title text        NOT NULL,
  company_name    text        NOT NULL,
  award_kind      award_kind,
  sdg_ids         smallint[]  NOT NULL CHECK (cardinality(sdg_ids) BETWEEN 1 AND 17),
  points          integer     NOT NULL CHECK (points >= 0),
  issued_on       date        NOT NULL,
  content_hash    char(64)    NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  verify_code     text        GENERATED ALWAYS AS (upper(substr(content_hash, 1, 4) || '-' || substr(content_hash, 5, 4) || '-' || substr(content_hash, 9, 4))) STORED,
  qr_payload      text        GENERATED ALWAYS AS ('SDGS-COMPASS|' || serial_no || '|' || substr(content_hash, 1, 32)) STORED,
  chain_tx        text,                                              -- Phase 2: 블록체인에 기록한 거래 번호
  revoked_at      timestamptz,
  revoked_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificates_award_iff_kind CHECK ((kind = 'award') = (award_kind IS NOT NULL)),
  CONSTRAINT certificates_revoked_reason CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL))
);
CREATE INDEX certificates_user_idx ON certificates (user_id);

CREATE FUNCTION certificates_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  expected text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    expected := certificate_hash(certificate_payload(NEW.serial_no, NEW.kind, NEW.holder_name, NEW.challenge_title,
                                                     NEW.company_name, NEW.award_kind, NEW.sdg_ids, NEW.points, NEW.issued_on));
    IF NEW.content_hash <> expected THEN
      RAISE EXCEPTION '증명서 해시가 내용과 맞지 않아요 (expected %)', expected USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  -- 발급 뒤에는 폐기(revoked_*)와 블록체인 기록(chain_tx)만 바꿀 수 있어요
  IF (NEW.serial_no, NEW.user_id, NEW.activity_id, NEW.kind, NEW.holder_name, NEW.challenge_title, NEW.company_name,
      NEW.award_kind, NEW.sdg_ids, NEW.points, NEW.issued_on, NEW.content_hash)
     IS DISTINCT FROM
     (OLD.serial_no, OLD.user_id, OLD.activity_id, OLD.kind, OLD.holder_name, OLD.challenge_title, OLD.company_name,
      OLD.award_kind, OLD.sdg_ids, OLD.points, OLD.issued_on, OLD.content_hash) THEN
    RAISE EXCEPTION '발급된 증명서의 내용은 고칠 수 없어요 — 폐기하고 새로 발급해 주세요' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER certificates_guard_ins BEFORE INSERT ON certificates FOR EACH ROW EXECUTE FUNCTION certificates_guard();
CREATE TRIGGER certificates_guard_upd BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION certificates_guard();

-- QR 로 들어온 확인 요청: 증명서 번호와 QR 안의 해시 앞 32자리로 진위를 가려요
--   valid 정상 / revoked 폐기됨 / tampered 내용이나 해시가 다름 / unknown 그런 증명서 없음
CREATE FUNCTION verify_certificate(p_serial text, p_hash_prefix text) RETURNS verify_result
  LANGUAGE plpgsql STABLE AS $$
DECLARE
  c certificates%ROWTYPE;
BEGIN
  SELECT * INTO c FROM certificates WHERE serial_no = p_serial;
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  IF c.content_hash <> certificate_hash(certificate_payload(c.serial_no, c.kind, c.holder_name, c.challenge_title,
                                                           c.company_name, c.award_kind, c.sdg_ids, c.points, c.issued_on))
     OR left(c.content_hash, char_length(p_hash_prefix)) <> lower(p_hash_prefix) THEN
    RETURN 'tampered';
  END IF;
  IF c.revoked_at IS NOT NULL THEN
    RETURN 'revoked';
  END IF;
  RETURN 'valid';
END $$;

-- 확인한 기록 (기업이 지원자의 실적을 확인한 흔적). 쌓기만 하고 고치지 않아요.
CREATE TABLE certificate_verifications (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  serial_no           text          NOT NULL,
  certificate_id      uuid          REFERENCES certificates (id) ON DELETE SET NULL,
  result              verify_result NOT NULL,
  verifier_company_id uuid          REFERENCES companies (id),
  verified_at         timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX certificate_verifications_cert_idx ON certificate_verifications (certificate_id);
CREATE TRIGGER certificate_verifications_immutable BEFORE UPDATE ON certificate_verifications FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ============================================================================
-- 6. 인재 검색 · 스카우트 · 1:1 메시지 (F-601 ~ F-603)
-- ============================================================================

-- F-601 인재 검색에 보이는 정보: 공개를 허용한 학생만 (비공개 사용자는 제외)
CREATE VIEW talent_directory AS
  SELECT sp.user_id, sp.nickname, sp.university_name, sp.faculty, sp.grad_year, sp.scoutable,
         t.total_points, t.level,
         (SELECT count(*) FROM awards a JOIN proposals p ON p.id = a.proposal_id WHERE p.submitter_id = sp.user_id) AS award_count,
         ARRAY(SELECT i.sdg_id     FROM profile_sdg_interests i WHERE i.user_id = sp.user_id ORDER BY i.priority) AS sdg_interests,
         ARRAY(SELECT s.skill_code FROM profile_skills s        WHERE s.user_id = sp.user_id ORDER BY s.skill_code) AS skills
    FROM student_profiles sp
    JOIN users u         ON u.id = sp.user_id AND u.status = 'active' AND u.deleted_at IS NULL
    JOIN impact_totals t ON t.user_id = sp.user_id
   WHERE sp.portfolio_visibility <> 'private';

-- F-602 스카우트 제안 (기업 → 학생). 같은 학생에게 거듭 보낼 수 없고, 하루 3건까지예요 (SCOUT_DAILY_LIMIT, 일본 시간 기준).
CREATE TABLE scouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid         NOT NULL REFERENCES companies (id),
  sender_id    uuid         NOT NULL,
  student_id   uuid         NOT NULL REFERENCES student_profiles (user_id),
  proposal_id  uuid         REFERENCES proposals (id),               -- 스카우트의 계기가 된 제출작
  kind         scout_kind   NOT NULL,
  message      text         NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 1000),
  source_lang  locale_code  NOT NULL DEFAULT 'ja',
  status       scout_status NOT NULL DEFAULT 'sent',
  sent_at      timestamptz  NOT NULL DEFAULT now(),
  sent_on      date         GENERATED ALWAYS AS (jst_date(sent_at)) STORED,
  read_at      timestamptz,
  responded_at timestamptz,
  UNIQUE (company_id, student_id),
  FOREIGN KEY (company_id, sender_id) REFERENCES company_members (company_id, user_id),
  CONSTRAINT scouts_responded CHECK ((status IN ('accepted', 'declined')) = (responded_at IS NOT NULL))
);
CREATE INDEX scouts_company_day_idx ON scouts (company_id, sent_on);
CREATE INDEX scouts_student_idx ON scouts (student_id, sent_at DESC);

CREATE FUNCTION scouts_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  sent_today integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = NEW.company_id AND status = 'approved') THEN
    RAISE EXCEPTION '승인된 기업만 스카우트를 보낼 수 있어요' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM student_profiles WHERE user_id = NEW.student_id AND scoutable AND portfolio_visibility <> 'private') THEN
    RAISE EXCEPTION '스카우트를 받지 않는 학생이에요 (F-601)' USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO sent_today FROM scouts WHERE company_id = NEW.company_id AND sent_on = jst_date(NEW.sent_at);
  IF sent_today >= 3 THEN
    RAISE EXCEPTION '하루에 보낼 수 있는 스카우트는 3건까지예요 (F-602)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER scouts_guard_ins BEFORE INSERT ON scouts FOR EACH ROW EXECUTE FUNCTION scouts_guard();

-- F-603 1:1 대화방 (기업 ↔ 학생). 스카우트를 학생이 수락하면 연락처 마스킹이 풀려요.
CREATE TABLE conversations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES companies (id),
  student_id          uuid        NOT NULL REFERENCES student_profiles (user_id),
  scout_id            uuid        UNIQUE REFERENCES scouts (id) ON DELETE SET NULL,
  contact_released_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, student_id)
);
CREATE INDEX conversations_student_idx ON conversations (student_id);

CREATE FUNCTION scouts_release_contact() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    UPDATE conversations SET contact_released_at = now() WHERE scout_id = NEW.id AND contact_released_at IS NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER scouts_release_contact_upd AFTER UPDATE OF status ON scouts FOR EACH ROW EXECUTE FUNCTION scouts_release_contact();

-- 메일 주소·전화번호처럼 보이는 글자를 가려요 (F-603). 데모용 규칙이고, 실서비스는 전용 검출기를 붙여요.
CREATE FUNCTION mask_contacts(txt text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT regexp_replace(
             regexp_replace(txt, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '***@***', 'g'),
             '\+[0-9]{1,3}[ -]?[0-9]{1,4}[ -]?[0-9]{3,4}[ -]?[0-9]{3,4}|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{3,4}',
             '***-****-****', 'g')
  $$;

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid         NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       uuid         NOT NULL REFERENCES users (id),
  body            text         NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  body_masked     text         GENERATED ALWAYS AS (mask_contacts(body)) STORED,   -- contact_released_at 전에는 이 쪽을 보여줘요
  source_lang     locale_code  NOT NULL DEFAULT 'ja',
  sent_at         timestamptz  NOT NULL DEFAULT now(),
  read_at         timestamptz,
  blinded_at      timestamptz                                                     -- F-702
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, sent_at);

-- 보낸 사람은 그 대화방의 학생 본인이거나 그 기업의 구성원이어야 해요
CREATE FUNCTION messages_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  conv conversations%ROWTYPE;
BEGIN
  SELECT * INTO conv FROM conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_id <> conv.student_id
     AND NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = conv.company_id AND user_id = NEW.sender_id) THEN
    RAISE EXCEPTION '이 대화방의 참가자만 메시지를 보낼 수 있어요' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_guard_ins BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION messages_guard();

-- F-603 면접 일정 조율: 같은 대화방에서 확정된 면접이 겹칠 수 없어요 (EXCLUDE)
CREATE TABLE interview_slots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  proposed_by     uuid        NOT NULL REFERENCES users (id),
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  status          slot_status NOT NULL DEFAULT 'proposed',
  meeting_url     text        CHECK (meeting_url IS NULL OR meeting_url ~* '^https://'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT interview_slots_order CHECK (ends_at > starts_at),
  CONSTRAINT interview_slots_no_overlap EXCLUDE USING gist (
    conversation_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status = 'confirmed')
);
CREATE INDEX interview_slots_conversation_idx ON interview_slots (conversation_id, starts_at);

-- ============================================================================
-- 7. ESG 리포트 · SDGs 인증마크 (F-403, 인증마크 부여 프로세스)
-- ============================================================================

-- F-403 ESG 성과 리포트 (PDF/Excel). 만든 시점의 집계값을 snapshot 으로 함께 남겨요.
CREATE TABLE esg_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES companies (id),
  period_start date        NOT NULL,
  period_end   date        NOT NULL,
  file_format  text        NOT NULL CHECK (file_format IN ('pdf', 'xlsx')),
  file_key     text        NOT NULL,
  snapshot     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid        NOT NULL REFERENCES users (id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esg_reports_period CHECK (period_end >= period_start)
);
CREATE INDEX esg_reports_company_idx ON esg_reports (company_id, generated_at DESC);

-- ① 설문·수치 입력 → ② 증빙 자료 제출 → ③ 기준을 넘으면 인증마크 자동 부여.
-- ※ 인증마크는 UN SDGs 지표를 바탕으로 한 독자 시스템이며 유엔의 공식 인증이 아니에요 (앱 안에 항상 안내: CERT_DISCLAIMER).
CREATE FUNCTION cert_item_points(p_code text, p_value bigint, p_has_evidence boolean) RETURNS numeric
  LANGUAGE sql STABLE
  AS $$
    -- 증빙이 없는 항목은 0점. 값은 0~최댓값으로 맞춘 뒤, 목표 대비 비율(최대 1)에 배점을 곱해 소수 첫째 자리까지 (evaluateCertification)
    SELECT CASE WHEN p_has_evidence
                THEN round(c.weight * least(1::numeric, greatest(0, least(p_value, c.max_value))::numeric / c.target), 1)
                ELSE 0::numeric END
      FROM cert_criteria c WHERE c.code = p_code
  $$;

CREATE FUNCTION cert_level(p_score numeric) RETURNS smallint
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT (CASE WHEN p_score >= 80 THEN 3 WHEN p_score >= 60 THEN 2 WHEN p_score >= 40 THEN 1 ELSE 0 END)::smallint $$;   -- CERT_LEVEL_THRESHOLDS [40, 60, 80]

CREATE TABLE cert_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES companies (id),
  status       cert_status NOT NULL DEFAULT 'draft',
  score        smallint    CHECK (score BETWEEN 0 AND 100),
  level        smallint    GENERATED ALWAYS AS (CASE WHEN score IS NULL THEN NULL ELSE cert_level(score) END) STORED,
  submitted_at timestamptz,
  decided_at   timestamptz,
  decided_by   uuid        REFERENCES users (id),
  valid_until  date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cert_applications_submitted CHECK ((status = 'draft') = (submitted_at IS NULL)),
  CONSTRAINT cert_applications_decided   CHECK ((status IN ('granted', 'rejected')) = (decided_at IS NOT NULL)),
  CONSTRAINT cert_applications_granted   CHECK (status <> 'granted' OR (level >= 1 AND valid_until IS NOT NULL))
);
CREATE INDEX cert_applications_company_idx ON cert_applications (company_id, created_at DESC);

CREATE TABLE cert_answers (
  application_id uuid   NOT NULL REFERENCES cert_applications (id) ON DELETE CASCADE,
  criterion_code text   NOT NULL REFERENCES cert_criteria (code),
  value          bigint NOT NULL CHECK (value >= 0),
  evidence_key   text,                                            -- ② 증빙 자료 (없으면 점수에 넣지 않아요)
  points         numeric(4,1) NOT NULL DEFAULT 0,                 -- 얻은 점수: 아래 트리거가 cert_criteria 기준표로 계산해요
  PRIMARY KEY (application_id, criterion_code)
);

CREATE FUNCTION cert_answers_compute() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  limit_value numeric;
BEGIN
  SELECT max_value INTO limit_value FROM cert_criteria WHERE code = NEW.criterion_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION '심사 기준표에 없는 항목이에요 (%)', NEW.criterion_code USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF NEW.value > limit_value THEN
    RAISE EXCEPTION '% 의 입력값은 % 이하여야 해요', NEW.criterion_code, limit_value USING ERRCODE = 'check_violation';
  END IF;
  IF (SELECT status FROM cert_applications WHERE id = NEW.application_id) <> 'draft' THEN
    RAISE EXCEPTION '제출한 신청서의 답변은 고칠 수 없어요' USING ERRCODE = 'check_violation';
  END IF;
  NEW.points := cert_item_points(NEW.criterion_code, NEW.value, NEW.evidence_key IS NOT NULL);
  RETURN NEW;
END $$;
CREATE TRIGGER cert_answers_compute_ins BEFORE INSERT OR UPDATE ON cert_answers FOR EACH ROW EXECUTE FUNCTION cert_answers_compute();

-- 제출(draft → submitted)하는 순간 점수를 서버가 다시 계산해서 넣어요. 신청자가 점수를 직접 정할 수 없어요.
CREATE FUNCTION cert_applications_score() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    NEW.score := round(COALESCE((SELECT sum(points) FROM cert_answers WHERE application_id = NEW.id), 0))::smallint;
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cert_applications_score_upd BEFORE UPDATE OF status ON cert_applications FOR EACH ROW EXECUTE FUNCTION cert_applications_score();

-- ============================================================================
-- 8. 운영 · 신고 · 감사 · 통계 · 번역 (F-701 ~ F-703)
-- ============================================================================

-- F-702 신고 (저작권·표절·부적절한 내용). 대상이 여러 표라서 target_id 는 FK 없이 두고 앱이 존재를 확인해요.
CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_type report_target NOT NULL,
  target_id   uuid          NOT NULL,
  reason      report_reason NOT NULL,
  detail      text          CHECK (char_length(detail) <= 2000),
  status      report_status NOT NULL DEFAULT 'open',
  handled_by  uuid          REFERENCES users (id),
  handled_at  timestamptz,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id),
  CONSTRAINT reports_handled CHECK ((status = 'open') = (handled_at IS NULL))
);
CREATE INDEX reports_open_idx ON reports (created_at) WHERE status = 'open';

-- F-701 블랙리스트 (사용자 또는 기업 중 하나). 올리면 계정·기업 상태가 함께 바뀌고, 풀면 되돌아가요.
CREATE TABLE blacklist_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES users (id),
  company_id  uuid        REFERENCES companies (id),
  reason      text        NOT NULL CHECK (char_length(btrim(reason)) > 0),
  created_by  uuid        NOT NULL REFERENCES users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  CONSTRAINT blacklist_one_subject CHECK ((user_id IS NOT NULL) <> (company_id IS NOT NULL))
);
CREATE UNIQUE INDEX blacklist_active_user    ON blacklist_entries (user_id)    WHERE user_id IS NOT NULL    AND released_at IS NULL;
CREATE UNIQUE INDEX blacklist_active_company ON blacklist_entries (company_id) WHERE company_id IS NOT NULL AND released_at IS NULL;

CREATE FUNCTION blacklist_apply() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users     SET status = 'blacklisted' WHERE id = NEW.user_id;
    UPDATE companies SET status = 'suspended'   WHERE id = NEW.company_id;
  ELSIF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
    UPDATE users     SET status = 'active'   WHERE id = NEW.user_id AND status = 'blacklisted';
    UPDATE companies SET status = 'approved' WHERE id = NEW.company_id AND status = 'suspended';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER blacklist_apply_ins AFTER INSERT ON blacklist_entries FOR EACH ROW EXECUTE FUNCTION blacklist_apply();
CREATE TRIGGER blacklist_apply_upd AFTER UPDATE OF released_at ON blacklist_entries FOR EACH ROW EXECUTE FUNCTION blacklist_apply();

-- 관리자 작업 기록 (감사 로그): 쌓기만 하고 고치거나 지울 수 없어요.
CREATE TABLE admin_actions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id    uuid        NOT NULL REFERENCES users (id),
  action      text        NOT NULL CHECK (action ~ '^[a-z_.]+$'),
  target_type text        NOT NULL,
  target_id   uuid,
  detail      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_actions_target_idx ON admin_actions (target_type, target_id);
CREATE TRIGGER admin_actions_immutable BEFORE UPDATE OR DELETE ON admin_actions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- F-703 일별 통계 (가입 수·제출 수·매칭 수 …). sdg_id 가 있으면 SDG 별 트렌드예요.
CREATE TABLE analytics_daily (
  id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day    date     NOT NULL,
  metric text     NOT NULL CHECK (metric ~ '^[a-z][a-z0-9_]*$'),
  sdg_id smallint REFERENCES sdgs (id),
  value  numeric  NOT NULL CHECK (value >= 0)
);
CREATE UNIQUE INDEX analytics_daily_key ON analytics_daily (day, metric, COALESCE(sdg_id, 0));

-- 일본어↔한국어 번역 캐시: 사용자가 쓴 글(챌린지·기업 소개·게시글·메시지)을 반대 언어로 보여 줄 때 써요.
CREATE TABLE content_translations (
  entity             text        NOT NULL CHECK (entity IN ('challenge', 'company', 'team_post', 'comment', 'message')),
  entity_id          uuid        NOT NULL,
  field              text        NOT NULL CHECK (field ~ '^[a-z_]+$'),
  locale             locale_code NOT NULL,
  body               text        NOT NULL,
  machine_translated boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, entity_id, field, locale)
);

-- ============================================================================
-- 9. 집계용 뷰
-- ============================================================================

-- 기업 대시보드·챌린지 목록: 응모자 수, 관심 수, 평균 심사 점수, 남은 일수
CREATE VIEW challenge_stats AS
  SELECT c.id AS challenge_id, c.company_id, c.status, c.closes_at,
         (SELECT count(*) FROM proposals p WHERE p.challenge_id = c.id AND p.status NOT IN ('withdrawn', 'blinded')) AS applicants,
         (SELECT count(*) FROM bookmarks b WHERE b.challenge_id = c.id) AS bookmarks,
         (SELECT round(avg(r.average), 2) FROM reviews r WHERE r.challenge_id = c.id) AS avg_score,
         GREATEST(0, jst_date(c.closes_at) - jst_date(now())) AS days_left
    FROM challenges c;

-- 수수료·기부 요약 (summarizeMatches): 기업별 건수·수수료·기부액·운영 수익
CREATE VIEW company_fee_summary AS
  SELECT company_id, count(*)::integer AS match_count,
         sum(fee_yen)::integer AS fee_yen, sum(donation_yen)::integer AS donation_yen, sum(revenue_yen)::integer AS revenue_yen
    FROM matches
   GROUP BY company_id;

-- ============================================================================
-- 9-2. 외래 키 보조 색인 — 부모 행을 지울 때(CASCADE/SET NULL) 자식 표를 처음부터 끝까지 훑지 않게 해요
--      (db/tests/01_structure.sql 이 "삭제 연쇄 외래 키의 첫 열이 색인돼 있는지" 확인해요)
-- ============================================================================
CREATE INDEX challenge_comments_parent_idx ON challenge_comments (parent_id, challenge_id) WHERE parent_id IS NOT NULL;
CREATE INDEX challenge_judges_member_idx   ON challenge_judges (company_id, user_id);
CREATE INDEX notifications_challenge_idx   ON notifications (challenge_id) WHERE challenge_id IS NOT NULL;
CREATE INDEX share_cards_award_idx         ON share_cards (award_id) WHERE award_id IS NOT NULL;
CREATE INDEX share_cards_challenge_idx     ON share_cards (challenge_id) WHERE challenge_id IS NOT NULL;
CREATE INDEX team_members_user_idx         ON team_members (user_id);
CREATE INDEX team_posts_author_idx         ON team_posts (author_id);
CREATE INDEX team_requests_requester_idx   ON team_requests (requester_id);
CREATE INDEX teams_source_post_idx         ON teams (source_post_id) WHERE source_post_id IS NOT NULL;

-- ============================================================================
-- 10. 표 설명 (README 의 표 목록·ERD 는 이 설명을 DB 에서 그대로 읽어 만들어요: scripts/erd.mjs)
--     형식: "설명 — 기능 ID". 새 표를 만들면 여기에도 한 줄 추가해야 db/tests/01_structure.sql 이 통과해요.
-- ============================================================================
COMMENT ON TABLE sdgs                       IS 'UN SDGs 17개 목표 (번호·색·일본어/한국어 이름) — 참조 데이터';
COMMENT ON TABLE skills                     IS '스킬 태그 (디자인·마케팅 등) — F-102';
COMMENT ON TABLE badges                     IS '배지 정의 (첫걸음·챌린지 킹 등) — F-402';
COMMENT ON TABLE cert_criteria              IS 'SDGs 인증마크 심사 기준표 (항목·배점·목표값) — 인증마크';
COMMENT ON TABLE users                      IS '계정 (이메일·역할 B2C/B2B/Admin·앱 언어) — F-101';
COMMENT ON TABLE oauth_accounts             IS '소셜 로그인 연결 (Google·Kakao·Apple) — F-101';
COMMENT ON TABLE student_profiles           IS 'B2C 프로필 (학교·희망 직무·공개 범위) — F-102';
COMMENT ON TABLE profile_sdg_interests      IS '관심 SDGs 최대 5개와 우선순위 — F-102';
COMMENT ON TABLE profile_skills             IS '보유 스킬 태그 — F-102';
COMMENT ON TABLE companies                  IS '기업·기관 ESG 프로필과 브랜드관 (관리자 승인 필요) — F-103, F-701';
COMMENT ON TABLE company_sdgs               IS '기업이 힘쓰는 SDGs — F-103';
COMMENT ON TABLE company_members            IS '기업 소속 담당자·심사위원 — F-103, F-303';
COMMENT ON TABLE company_documents          IS '기업 인증 서류 (사업자 검증) — F-101, F-701';
COMMENT ON TABLE challenges                 IS 'SDGs 챌린지 (기업이 출제, 마감 7~90일, 관리자 승인 후 공개) — F-201';
COMMENT ON TABLE challenge_sdgs             IS '챌린지의 목표 SDGs (최대 3개) — F-202';
COMMENT ON TABLE challenge_skills           IS '챌린지가 구하는 스킬 (추천 피드용) — F-202';
COMMENT ON TABLE challenge_deliverables     IS '챌린지의 제출물 안내 — F-201';
COMMENT ON TABLE challenge_rewards          IS '보상 (상금·인턴십·채용 제안) — F-201';
COMMENT ON TABLE challenge_attachments      IS '챌린지 첨부 자료 (브리핑 PDF 등) — F-201';
COMMENT ON TABLE challenge_judges           IS '챌린지별 심사위원 (그 기업 구성원만) — F-303';
COMMENT ON TABLE challenge_comments         IS '챌린지 Q&A (질문·답변·댓글) — F-203';
COMMENT ON TABLE team_posts                 IS '팀 빌딩 게시판 글 ("이런 팀원을 찾아요") — F-203';
COMMENT ON TABLE team_post_roles            IS '팀 빌딩 글이 찾는 역할(스킬) — F-203';
COMMENT ON TABLE team_requests              IS '팀 참여 요청 (대기·수락·거절) — F-203';
COMMENT ON TABLE teams                      IS '확정된 팀 (한 챌린지에 한 팀) — F-203';
COMMENT ON TABLE team_members               IS '팀 구성원 (최대 인원 제한) — F-203';
COMMENT ON TABLE bookmarks                  IS '관심 챌린지(북마크) — F-204';
COMMENT ON TABLE notification_prefs         IS '알림 설정 (종류 × 채널) — F-204';
COMMENT ON TABLE device_tokens              IS '푸시 알림을 받을 기기 — F-204';
COMMENT ON TABLE notifications              IS '알림 (마감 D-7/D-3/D-1 등) — F-204';
COMMENT ON TABLE receipt_counters           IS '제출 수령증 번호의 날짜별 일련번호 — F-301';
COMMENT ON TABLE proposals                  IS '기획서 제출 (한 사람/팀 한 건, 수령증 번호) — F-301';
COMMENT ON TABLE proposal_versions          IS '제출 버전 (마감 전 재제출, 파일 SHA-256, 수정 불가) — F-302';
COMMENT ON TABLE reviews                    IS '심사 점수 (창의성·실현가능성·SDGs 기여도, 1~5점) — F-303';
COMMENT ON TABLE awards                     IS '수상 (대상 400·우수상 300·특별상 200 pt, 심사위원 전원 완료 후 확정) — F-303';
COMMENT ON TABLE matches                    IS '채용·사업화 매칭 (중개 수수료 ¥30,000, 기부 50%) — 수익 모델';
COMMENT ON TABLE donation_recipients        IS '기부처 (일본어/한국어 이름) — 수익 모델';
COMMENT ON TABLE donations                  IS '기업 이름으로 한 SDGs 기부 (금액은 매칭의 기부액과 같아야 함) — 수익 모델';
COMMENT ON TABLE share_cards                IS 'SNS 카드뉴스 (Instagram 1:1·LinkedIn 1.91:1) — F-501';
COMMENT ON TABLE activities                 IS '활동 기록 (참가·제출·수상·공유, 수정 불가) — F-401';
COMMENT ON TABLE activity_sdgs              IS '활동이 닿은 SDGs — F-401';
COMMENT ON TABLE impact_scores              IS 'SDG 별 누적 포인트와 점수 (레이더 차트) — F-401';
COMMENT ON TABLE user_badges                IS '획득한 배지 — F-402';
COMMENT ON TABLE portfolio_files            IS '직접 올린 포트폴리오 (PDF·URL) — F-104';
COMMENT ON TABLE certificates               IS '디지털 증명서 (SHA-256 해시·QR, 발급 후 수정 불가) — F-502';
COMMENT ON TABLE certificate_verifications  IS '증명서 진위 확인 기록 — F-502';
COMMENT ON TABLE scouts                     IS '스카우트 제안 (하루 3건, 같은 학생에게 한 번) — F-602';
COMMENT ON TABLE conversations              IS '기업 ↔ 학생 1:1 대화방 — F-603';
COMMENT ON TABLE messages                   IS '메시지 (연락처 마스킹) — F-603';
COMMENT ON TABLE interview_slots            IS '면접 일정 (확정 일정은 겹칠 수 없음) — F-603';
COMMENT ON TABLE esg_reports                IS 'ESG 성과 리포트 (PDF/Excel) — F-403';
COMMENT ON TABLE cert_applications          IS 'SDGs 인증마크 신청 (점수·★1~3) — 인증마크';
COMMENT ON TABLE cert_answers               IS '인증마크 항목별 답변과 증빙 — 인증마크';
COMMENT ON TABLE reports                    IS '신고 (저작권·표절·부적절) — F-702';
COMMENT ON TABLE blacklist_entries          IS '블랙리스트 (사용자 또는 기업) — F-701';
COMMENT ON TABLE admin_actions              IS '관리자 작업 기록 (수정·삭제 불가) — 감사 로그';
COMMENT ON TABLE analytics_daily            IS '일별 통계 (SDG 별 트렌드 포함) — F-703';
COMMENT ON TABLE content_translations       IS '일본어↔한국어 번역 캐시 — 다국어';

COMMENT ON VIEW proposal_current            IS '제출 건 + 가장 최신 버전 (심사 화면용) — F-302';
COMMENT ON VIEW impact_totals               IS '학생별 누적 포인트와 레벨 — F-401';
COMMENT ON VIEW talent_directory            IS '인재 검색에 보이는 학생 (비공개·정지 계정 제외) — F-601';
COMMENT ON VIEW challenge_stats             IS '챌린지별 응모자 수·관심 수·평균 점수·남은 일수 — F-402';
COMMENT ON VIEW company_fee_summary         IS '기업별 수수료·기부·운영 수익 요약 — 수익 모델';
