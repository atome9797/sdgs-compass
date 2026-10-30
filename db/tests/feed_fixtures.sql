-- SNS 피드 시험 도우미 — 04_parity.sql 과 06_feed.sql 이 fixtures.sql 다음에 \ir 로 불러와요 (이 세션 안에서만 살아 있는 임시 함수).
--   pg_temp.mk_activity(활동 id, 학생, 챌린지, SDGs)                       참가(participation) 활동 + 그 활동의 SDGs
--   pg_temp.mk_brag(글 id, 글쓴이, 실적 id, 본문, 태그 SDGs)               학생 자랑 글 + 태그 (글과 태그는 같은 트랜잭션에 넣어야 해요)
--   pg_temp.mk_pr(글 id, 글쓴이, 기업, 제목, 본문, 태그 SDGs, 챌린지)       기업 홍보 글 + 태그

CREATE FUNCTION pg_temp.mk_activity(p_id uuid, p_student uuid, p_challenge uuid, p_sdgs smallint[] DEFAULT ARRAY[14]::smallint[]) RETURNS uuid
  LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO activities (id, user_id, kind, challenge_id, title, company_name, points, occurred_on)
  VALUES (p_id, p_student, 'participation', p_challenge, '海洋プラスチックを減らす包装', 'みなと海洋フーズ', 50, current_date);
  INSERT INTO activity_sdgs (activity_id, sdg_id) SELECT p_id, unnest(p_sdgs);
  RETURN p_id;
END $$;

CREATE FUNCTION pg_temp.mk_brag(p_id uuid, p_author uuid, p_activity uuid, p_body text DEFAULT '初めての挑戦でした。次は大賞を目指します！',
                                p_sdgs smallint[] DEFAULT ARRAY[14]::smallint[]) RETURNS uuid
  LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO social_posts (id, kind, author_id, activity_id, body) VALUES (p_id, 'brag', p_author, p_activity, p_body);
  INSERT INTO social_post_sdgs (post_id, position, sdg_id) SELECT p_id, ord, sdg FROM unnest(p_sdgs) WITH ORDINALITY AS t(sdg, ord);
  RETURN p_id;
END $$;

CREATE FUNCTION pg_temp.mk_pr(p_id uuid, p_author uuid, p_company uuid, p_title text DEFAULT '漁港の朝市で、使い捨て容器を減らしました',
                              p_body text DEFAULT '学生のアイデアを実際に試した取り組みです。結果は来月まとめて公開します。',
                              p_sdgs smallint[] DEFAULT ARRAY[14]::smallint[], p_challenge uuid DEFAULT NULL) RETURNS uuid
  LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO social_posts (id, kind, author_id, company_id, challenge_id, title, body) VALUES (p_id, 'pr', p_author, p_company, p_challenge, p_title, p_body);
  INSERT INTO social_post_sdgs (post_id, position, sdg_id) SELECT p_id, ord, sdg FROM unnest(p_sdgs) WITH ORDINALITY AS t(sdg, ord);
  RETURN p_id;
END $$;
