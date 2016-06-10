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
        object_class     = 'User'
        AND action       = 'Created'
        AND subject_class = 'Alert'
        AND subject = $1
      ) OR
      (
        object_class     = 'User'
        AND action       = 'Edited'
        AND subject_class = 'Alert'
        AND subject = $1
      ) OR
      (
        object_class     = 'Listing'
        AND action       = 'BecameAvailable'
        AND auxiliary_subject_class = 'Alert'
        AND auxiliary_subject = $1
      )
  )