-- 시험 도우미 — 이 세션 안에서만 살아 있는 임시 함수예요 (\ir 로 불러와요).
--   pg_temp.ok(조건, 설명)                       조건이 참인지
--   pg_temp.eq(실제, 기대, 설명)                 값이 같은지 (타입은 맞춰서 비교)
--   pg_temp.fails(SQL, SQLSTATE, 설명)           그 SQL 이 기대한 오류로 막히는지 (실패한 시도는 되돌려요)
\set ON_ERROR_STOP on
\set QUIET on
SET client_min_messages = notice;

CREATE FUNCTION pg_temp.ok(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: %', label;
  END IF;
  RAISE NOTICE 'ok   - %', label;
END $$;

CREATE FUNCTION pg_temp.eq(actual anyelement, expected anyelement, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FAIL: % — 기대 [%] 실제 [%]', label, expected, actual;
  END IF;
  RAISE NOTICE 'ok   - % (= %)', label, actual;
END $$;

CREATE FUNCTION pg_temp.fails(stmt text, expected_state text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN
      RAISE NOTICE 'ok   - % ⟵ %', label, split_part(SQLERRM, E'\n', 1);
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL: % — 기대한 오류 %, 실제 % (%)', label, expected_state, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL: % — % 오류를 기대했는데 문장이 성공했어요', label, expected_state;
END $$;

CREATE FUNCTION pg_temp.none(query text, label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  n bigint;
  sample text;
BEGIN
  EXECUTE 'SELECT count(*) FROM (' || query || ') q' INTO n;
  IF n > 0 THEN
    EXECUTE 'SELECT string_agg(q::text, E''\n'') FROM (SELECT * FROM (' || query || ') x LIMIT 5) q' INTO sample;
    RAISE EXCEPTION E'FAIL: % — 어긋난 행 %개 (앞 5개)\n%', label, n, sample;
  END IF;
  RAISE NOTICE 'ok   - %', label;
END $$;
\set QUIET off
