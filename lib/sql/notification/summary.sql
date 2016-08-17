WITH rn AS (
  SELECT JSON_BUILD_OBJECT(
    'type', 'room_notification_summary',
    'room_id', notifications.room,
    'user_created_alert_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Created' AND
            notifications.object_class = 'Alert' AND
            notifications.deleted_at IS NULL AND
            (SELECT deleted_at FROM alerts WHERE id = notifications.object) IS NULL
      ),
    'user_edited_alert_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Edited' AND
            notifications.object_class = 'Alert' AND
            notifications.deleted_at IS NULL AND
            (SELECT deleted_at FROM alerts WHERE id = notifications.object) IS NULL
      ),
    'listing_became_available_room_ids', ARRAY_AGG(notifications.auxiliary_subject) FILTER (
      WHERE notifications.subject_class = 'Listing' AND
            notifications.action = 'BecameAvailable' AND
            notifications.object_class = 'Room' AND
            notifications.deleted_at IS NULL AND
            (SELECT deleted_at FROM alerts WHERE id = notifications.auxiliary_subject) IS NULL
      ),
    'user_favorited_recommendation_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Favorited' AND
            notifications.object_class = 'Recommendation' AND
            notifications.deleted_at IS NULL AND
            (
              SELECT BOOL_OR(COALESCE(CASE WHEN alerts.deleted_at IS NULL THEN TRUE ELSE FALSE END))
              FROM alerts
              WHERE ARRAY[id] <@ (SELECT referring_objects FROM recommendations WHERE id = notifications.object)
            ) IS TRUE
      ),
    'user_shared_listing', ARRAY_AGG(notifications.recommendation) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Shared' AND
            notifications.object_class = 'Listing' AND
            notifications.deleted_at IS NULL AND
            (
              SELECT BOOL_OR(COALESCE(CASE WHEN alerts.deleted_at IS NULL THEN TRUE ELSE FALSE END))
              FROM alerts
              WHERE ARRAY[id] <@ (SELECT referring_objects FROM recommendations WHERE id = notifications.recommendation)
            ) IS TRUE
      ),
    'listing_price_dropped_recommendation_ids', ARRAY_AGG(notifications.recommendation) FILTER (
      WHERE notifications.subject_class = 'Listing' AND
            notifications.action = 'PriceDropped' AND
            notifications.object_class = 'Room' AND
            notifications.deleted_at IS NULL AND
            (
              SELECT BOOL_OR(COALESCE(CASE WHEN alerts.deleted_at IS NULL THEN TRUE ELSE FALSE END))
              FROM alerts
              WHERE ARRAY[id] <@ (SELECT referring_objects FROM recommendations WHERE id = notifications.recommendation)
            ) IS TRUE
      ),
    'listing_status_changed_recommendation_ids', ARRAY_AGG(notifications.recommendation) FILTER (
      WHERE notifications.subject_class = 'Listing' AND
            notifications.action = 'StatusChanged' AND
            notifications.object_class = 'Room' AND
            notifications.deleted_at IS NULL AND
            (
              SELECT BOOL_OR(COALESCE(CASE WHEN alerts.deleted_at IS NULL THEN TRUE ELSE FALSE END))
              FROM alerts
              WHERE ARRAY[id] <@ (SELECT referring_objects FROM recommendations WHERE id = notifications.recommendation)
            ) IS TRUE
      ),
    'user_created_cma', ARRAY_AGG(notifications.auxiliary_object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Created' AND
            notifications.object_class = 'CMA' AND
            notifications.deleted_at IS NULL
      ),
    'user_sent_message_ids', ARRAY_AGG(notifications.auxiliary_object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Sent' AND
            notifications.object_class = 'Message' AND
            notifications.deleted_at IS NULL
      )
  ) AS r
  FROM notifications
  INNER JOIN notifications_users
    ON notifications.id = notifications_users.notification
  INNER JOIN rooms
    ON notifications.room = rooms.id
  WHERE
    notifications_users.user = $1 AND
    notifications.room = ANY (SELECT room FROM rooms_users WHERE "user" = $1) AND
    notifications_users.acked_at IS NULL AND
    notifications.room IS NOT NULL AND
    rooms.deleted_at IS NULL AND
    (COALESCE(notifications.exclude <> $1, TRUE) OR
    COALESCE(notifications.specific = $1, FALSE))
  GROUP BY notifications.room
),
tc AS (
  SELECT tasks.id AS task
  FROM notifications
  INNER JOIN notifications_users
    ON notifications.id = notifications_users.notification
  INNER JOIN tasks
    ON (notifications.object = tasks.id OR notifications.subject = tasks.id)
  WHERE notifications.specific = $1 AND
        notifications_users.acked_at IS NULL AND
        notifications_users.user = $1 AND
        notifications.room IS NULL AND
        (
          notifications.object_class = 'Task' OR
          notifications.subject_class = 'Task'
        )
),
trc AS (
  SELECT transactions.id AS transaction
  FROM notifications
  INNER JOIN notifications_users
    ON notifications.id = notifications_users.notification
  INNER JOIN transactions
    ON (notifications.object = transactions.id OR notifications.subject = transactions.id)
  WHERE notifications.specific = $1 AND
        notifications_users.acked_at IS NULL AND
        notifications_users.user = $1 AND
        notifications.room IS NULL AND
        (
          notifications.object_class = 'Transaction' OR
          notifications.subject_class = 'Transaction'
        )
),
tco AS (
  SELECT contacts.id AS contact
  FROM notifications
  INNER JOIN notifications_users
    ON notifications.id = notifications_users.notification
  INNER JOIN contacts
    ON (notifications.object = contacts.id OR notifications.subject = contacts.id)
  WHERE notifications.specific = $1 AND
        notifications_users.acked_at IS NULL AND
        notifications_users.user = $1 AND
        notifications.room IS NULL AND
        (
          notifications.object_class = 'Contact' OR
          notifications.subject_class = 'Contact'
        )
)
SELECT 'notification_summary' AS type,
       (SELECT COUNT(*) FROM tc)::int AS task_notification_count,
       (SELECT COUNT(*) FROM trc)::int AS transaction_notification_count,
       COUNT(r)::int AS room_notification_count,
       ((SELECT COUNT(*) FROM tc) + (SELECT COUNT(*) FROM trc) + COALESCE(ARRAY_LENGTH(ARRAY_AGG(r), 1), 0))::int AS total_notification_count,
       COALESCE((SELECT ARRAY_AGG(task) from tc), '{}'::uuid[]) AS task_ids,
       COALESCE((SELECT ARRAY_AGG(transaction) from trc), '{}'::uuid[]) AS transaction_ids,
       COALESCE((SELECT ARRAY_AGG(contact) from tco), '{}'::uuid[]) AS contact_ids,
       COALESCE(ARRAY_AGG(r), '{}'::json[]) AS room_notification_summaries
FROM rn
