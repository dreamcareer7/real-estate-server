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
      (
        subject_class     = 'User'
        AND action       = 'Created'
        AND object_class = 'Alert'
        AND object = $2
      ) OR
      (
        subject_class     = 'User'
        AND action       = 'Edited'
        AND object_class = 'Alert'
        AND object = $2
      ) OR
      (
        subject_class     = 'Listing'
        AND action       = 'BecameAvailable'
        AND auxiliary_subject_class = 'Alert'
        AND auxiliary_subject = $2
      )
  )