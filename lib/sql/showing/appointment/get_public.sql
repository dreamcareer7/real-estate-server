SELECT
  a.id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  "time",
  status,
  buyer_message,
  (SELECT human_readable_id FROM showings WHERE showings.id = a.showing) AS showing,
  (SELECT display_name FROM contacts WHERE contacts.id = a.contact) AS client_name,

  (SELECT comment FROM showings_approvals
    WHERE appointment = a.id
    ORDER BY approved ASC,
             updated_at DESC,
             created_at DESC
    LIMIT 1) AS role_message,

  'showing_appointment_public' AS type
FROM
  showings_appointments AS a
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = a.id
ORDER BY
  t.ord
