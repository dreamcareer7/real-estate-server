UPDATE notifications_users
SET
  acked_at = CLOCK_TIMESTAMP()
WHERE
  acked_at IS NULL AND
  "user" = $1 AND
  (
    notification IN
    (
      SELECT id FROM notifications
      WHERE
      (
        subject_class = 'User' AND
        action = 'Created' AND
        object_class = 'Alert' AND
        object = $2
      ) OR
      (
        subject_class = 'User' AND
        action = 'Edited' AND
        object_class = 'Alert' AND
        object = $2
      ) OR
      (
        subject_class = 'Listing' AND
        action = 'BecameAvailable' AND
        auxiliary_subject_class = 'Alert' AND
        auxiliary_subject = $2
      )
    ) OR
    notification IN
    (
      SELECT notifications.id FROM notifications
      INNER JOIN recommendations
      ON notifications.auxiliary_subject = recommendations.id
      WHERE notifications.subject_class = 'Listing' AND
            notifications.action = 'BecameAvailable' AND
            notifications.object_class = 'Room' AND
            $2 = ANY(recommendations.referring_objects)
    ) OR
    notification IN
    (
      SELECT notifications.id FROM notifications
      INNER JOIN recommendations
      ON notifications.recommendation = recommendations.id
      WHERE
      (
        notifications.subject_class = 'Listing' AND
        notifications.action = 'PriceDropped' AND
        notifications.object_class = 'Room' AND
        $2 = ANY(recommendations.referring_objects)
      ) OR
      (
        notifications.subject_class = 'Listing' AND
        notifications.action = 'StatusChanged' AND
        notifications.object_class = 'Room' AND
        $2 = ANY(recommendations.referring_objects)
      ) OR
      (
        notifications.subject_class = 'OpenHouse' AND
        notifications.action = 'Available' AND
        notifications.object_class = 'Listing' AND
        $2 = ANY(recommendations.referring_objects)
      )
    )
  )
