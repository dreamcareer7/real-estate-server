SELECT
  'billing_plan' AS TYPE,
  chargebee_object->'name' as name,
  chargebee_object->'currency_code' as currency_code,
  chargebee_object->'period' as period,
  chargebee_object->'period_unit' as period_unit,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM billing_plans
JOIN unnest($1::uuid[]) WITH ORDINALITY t(pid, ord) ON billing_plans.id = pid
ORDER BY t.ord
