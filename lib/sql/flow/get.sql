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
  origin AS origin_id,
  name,
  description,
  extract(epoch FROM starts_at) AS starts_at,
  contact,
  extract(epoch FROM last_step_date) AS last_step_date,

  (
    SELECT
      array_agg(id ORDER BY created_at)
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
