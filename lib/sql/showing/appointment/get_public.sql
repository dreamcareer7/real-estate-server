SELECT
  a.id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  "time",
  status,
  (SELECT human_readable_id FROM showings WHERE showings.id = a.showing) AS showing,

  'showing_appointment_public' AS type
FROM
  showings_appointments AS a
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = a.id
ORDER BY
  t.ord
