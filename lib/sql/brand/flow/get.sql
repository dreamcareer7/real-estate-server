SELECT
  id,
  EXTRACT(epoch FROM created_at) AS created_at,
  EXTRACT(epoch FROM updated_at) AS updated_at,
  created_by,
  updated_by,
  brand,
  name,
  description,

  (
    SELECT
      array_agg(id)
    FROM
      brands_flow_steps
    WHERE
      flow = brands_flows.id
      AND deleted_at IS NULL
  ) AS steps,

  'brand_flow' AS type
FROM
  brands_flows
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_flows.id = bid
ORDER BY
  t.ord
