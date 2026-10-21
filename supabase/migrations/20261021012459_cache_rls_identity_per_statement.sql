-- Read policies resolve identity/scope with initPlans. Keep ALL/write policies
-- unchanged: deleting/updating a profile can change a helper within that write.
-- Caller identity/scope does not depend on the read row. Use initPlans
-- to resolve it once per statement; keep all predicates, policy roles and grants.
-- Never cache these results across statements or mark the functions IMMUTABLE.
DO $migration$
DECLARE
  policy_row record;
  helper text;
  original_expression text;
  rewritten_expression text;
  using_expression text;
  check_expression text;
  expression_kind text;
  helpers constant text[] := ARRAY[
    'is_super_admin', 'is_admin_escuela', 'is_alumno', 'is_instructor',
    'get_my_escuela_id', 'get_my_sede_id', 'get_my_alumno_id', 'get_my_instructor_id'
  ];
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies WHERE schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    using_expression := policy_row.qual;
    check_expression := policy_row.with_check;
    FOREACH expression_kind IN ARRAY ARRAY['using', 'check'] LOOP
      original_expression := CASE WHEN expression_kind = 'using'
        THEN policy_row.qual ELSE policy_row.with_check END;
      IF original_expression IS NULL THEN CONTINUE; END IF;
      rewritten_expression := original_expression;
      FOREACH helper IN ARRAY helpers LOOP
        -- Protect existing scalar SELECTs first so rerunning is idempotent.
        rewritten_expression := regexp_replace(rewritten_expression,
          '\(\s*SELECT\s+(public\.)?' || helper || '\(\)(\s+AS\s+[a-zA-Z_][a-zA-Z_0-9]*)?\s*\)',
          '__cached_rls_' || helper || '__', 'gi');
        rewritten_expression := regexp_replace(rewritten_expression,
          '\m(public\.)?' || helper || '\(\)',
          '(SELECT public.' || helper || '())', 'g');
        rewritten_expression := replace(rewritten_expression,
          '__cached_rls_' || helper || '__', '(SELECT public.' || helper || '())');
      END LOOP;
      IF expression_kind = 'using' THEN using_expression := rewritten_expression;
      ELSE check_expression := rewritten_expression; END IF;
    END LOOP;
    IF using_expression IS DISTINCT FROM policy_row.qual
       OR check_expression IS DISTINCT FROM policy_row.with_check THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I%s%s',
        policy_row.policyname, policy_row.schemaname, policy_row.tablename,
        CASE WHEN using_expression IS NULL THEN '' ELSE ' USING (' || using_expression || ')' END,
        CASE WHEN check_expression IS NULL THEN '' ELSE ' WITH CHECK (' || check_expression || ')' END);
    END IF;
  END LOOP;
END;
$migration$;
