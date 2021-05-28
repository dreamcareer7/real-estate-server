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
      array_agg(id ORDER BY "order")
    FROM
      brands_flow_steps
    WHERE
      flow = brands_flows.id
      AND deleted_at IS NULL
  ) AS steps,

  (
    SELECT
      (count(flows.id))::INT
    FROM
      flows
      JOIN contacts
        ON contacts.id = flows.contact
    WHERE
      origin = brands_flows.id
      AND contacts.deleted_at IS NULL
      AND contacts.brand = flows.brand
      AND flows.deleted_at IS NULL
      AND (CASE WHEN $2::uuid IS NULL THEN TRUE ELSE flows.brand = $2::uuid END)
  ) AS active_flows,

  'brand_flow' AS type
FROM
  brands_flows
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_flows.id = bid
ORDER BY
  t.ord
