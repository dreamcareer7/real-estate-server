SELECT billing_plans.*,
  'billing_plan' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM billing_plans
JOIN unnest($1::uuid[]) WITH ORDINALITY t(pid, ord) ON billing_plans.id = pid
ORDER BY t.ord
