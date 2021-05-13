SELECT
  id, (COUNT(*) OVER ())::int AS total
FROM
  unread_notifications
WHERE
  "user" = $1::uuid
ORDER BY
  created_at
LIMIT $2