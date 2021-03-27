SELECT
  a.id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  source,
  "time",
  status,
  showing,
  contact,

  (
    SELECT
      array_agg(id order by "time") AS ids
    FROM
      showings_approvals
    WHERE
      appointment = a.id
  ) AS approvals,

  'showing_appointment' AS type
FROM
  showings_appointments AS a
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = a.id
ORDER BY
  t.ord
