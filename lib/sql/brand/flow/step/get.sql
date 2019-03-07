SELECT
  id,
  created_at,
  updated_at,
  created_by,
  updated_by,
  title,
  description,
  order,
  EXTRACT(epoch FROM due_in),
  event,

  'brand_flow_step' AS type
FROM
  brands_flow_steps
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_flow_steps.id = bid
ORDER BY
  t.ord
