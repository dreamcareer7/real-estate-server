SELECT
  a.id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  appointment,
  role,
  approved,
  "time",
  comment,

  'showing_approval' AS type
FROM
  showings_approvals AS a
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = a.id
ORDER BY
  t.ord
