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
      room IS NULL AND
      (
        object_class = 'Task' OR
        subject_class = 'Task'
      ) AND
      (
        object = $1 OR
        subject = $1
      )
  )