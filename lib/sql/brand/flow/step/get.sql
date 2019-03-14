SELECT
  id,
  EXTRACT(epoch FROM created_at) AS created_at,
  EXTRACT(epoch FROM updated_at) AS updated_at,
  created_by,
  updated_by,
  title,
  description,
  EXTRACT(epoch FROM due_in) AS due_in,
  event,
  email,

  'brand_flow_step' AS type
FROM
  brands_flow_steps
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_flow_steps.id = bid
ORDER BY
  t.ord
