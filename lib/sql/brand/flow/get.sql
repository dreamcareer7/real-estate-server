SELECT
  id,
  created_at,
  updated_at,
  created_by,
  updated_by,
  brand,
  name,
  description,

  (
    SELECT
      id
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
