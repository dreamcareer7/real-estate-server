SELECT
  id,
  EXTRACT(epoch FROM created_at) AS created_at,
  EXTRACT(epoch FROM updated_at) AS updated_at,
  created_by,
  updated_by,
  flow,
  is_automated,
  "order",
  title,
  description,
  EXTRACT(epoch FROM wait_for) AS wait_for,
  "time",
  event,
  email,
  template,
  template_instance,

  'brand_flow_step' AS type
FROM
  brands_flow_steps
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_flow_steps.id = bid
ORDER BY
  t.ord
