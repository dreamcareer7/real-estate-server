SELECT
  id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
  created_by,
  updated_by,
  deleted_by,
  brand,
  origin,
  name,
  description,
  extract(epoch FROM starts_at) AS starts_at,
  contact,

  (
    SELECT
      array_agg(id)
    FROM
      flows_steps
    WHERE
      flow = flows.id
      AND deleted_at IS NULL
  ) AS steps,

  'flow' AS type
FROM
  flows
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON flows.id = t.cid
ORDER BY
  t.ord
