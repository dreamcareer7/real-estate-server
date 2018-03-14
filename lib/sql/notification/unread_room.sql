SELECT id FROM unread_notifications
WHERE
  user = $1
  AND room = $2
