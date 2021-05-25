UPDATE notifications_users AS nu
SET
  acked_at = CLOCK_TIMESTAMP()
FROM
  notifications AS n
WHERE
  acked_at IS NULL
  AND "user" = $1
  AND nu.notification = n.id
  AND n.object_class = 'ShowingAppointment'
  AND n.object = $2::uuid