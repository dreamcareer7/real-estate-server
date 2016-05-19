UPDATE notifications_users
SET
  acked_at = NOW()
WHERE
  acked_at IS NULL
  AND "user" = $1
  AND notification IN
  (
    SELECT id FROM notifications
    WHERE
      specific = $2 AND
      room IS NULL AND
      (
        object_class = 'Transaction' OR
        subject_class = 'Transaction'
      ) AND
      (
        object = $1 OR
        subject = $1
      )
  )