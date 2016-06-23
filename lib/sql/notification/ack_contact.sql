UPDATE notifications_users
SET
  acked_at = NOW()
WHERE
  acked_at IS NULL
  AND "user" = $2
  AND notification IN
  (
    SELECT id FROM notifications
    WHERE
      (
        subject = $1 AND
        subject_class = 'Contact' AND
        action = 'CreatedFor' AND
        object_class = 'User'
      )
  )
