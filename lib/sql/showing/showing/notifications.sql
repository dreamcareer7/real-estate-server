SELECT
  id, (COUNT(*) OVER ())::int AS total
FROM
  unread_notifications un
  JOIN showing_appointments AS a
    ON un.object = a.id
  JOIN showings AS s
    ON a.showing = s.id
WHERE
  "user" = $1::uuid
  AND object_class = 'ShowingAppointment'
  AND s.deleted_at IS NULL
ORDER BY
  created_at
LIMIT $2
