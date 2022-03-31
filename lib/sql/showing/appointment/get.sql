SELECT
  a.id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  source,
  "time",
  status,
  showing,
  showing AS showing_id,
  contact,
  buyer_message,
  feedback,
  email,
  phone_number,
  first_name,
  last_name,
  company,

  (
    SELECT
      array_agg(id) AS ids
    FROM
      showings_approvals
    WHERE
      appointment = a.id
      AND showings_approvals.time = a.time
  ) AS approvals,

  (
    SELECT
      array_agg(id order by "time") AS ids
    FROM
      showings_approvals
    WHERE
      $3::text[] @> ARRAY['showing_appointment.approval_history']
      AND appointment = a.id
  ) AS approval_history,

  (
    SELECT
      array_agg(nn.id ORDER BY created_at DESC) AS ids
    FROM
      new_notifications AS nn
    WHERE
      $3::text[] @> ARRAY['showing_appointment.notifications']
      AND $2::uuid IS NOT NULL
      AND "object" = a.id
      AND object_class = 'ShowingAppointment'
      AND nn.deleted_at IS NULL
      AND nn.user = $2::uuid
  ) AS notifications,

  'showing_appointment' AS type
FROM
  showings_appointments AS a
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = a.id
ORDER BY
  t.ord
