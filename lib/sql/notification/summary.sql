WITH rn AS (
  SELECT JSON_BUILD_OBJECT(
    'type', 'room_notification_summary',
    'room_id', notifications.room,
    'user_created_alert_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Created' AND
            notifications.object_class = 'Alert'
      ),
    'user_edited_alert_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Edited' AND
            notifications.object_class = 'Alert'
      ),
    'listing_became_available_room_ids', ARRAY_AGG(notifications.auxiliary_subject) FILTER (
      WHERE notifications.subject_class = 'Listing' AND
            notifications.action = 'BecameAvailable' AND
            notifications.object_class = 'Room'
      ),
    'user_favorited_recommendation_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Favorited' AND
            notifications.object_class = 'Recommendation'
      ),
    'user_shared_listing', ARRAY_AGG(notifications.recommendation) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Shared' AND
            notifications.object_class = 'Listing'
      ),
    'user_joined_room_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Joined' AND
            notifications.object_class = 'Room'
      ),
    'user_invited_room_ids', ARRAY_AGG(notifications.object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Invited' AND
            notifications.object_class = 'Room'
      ),
    'user_created_cma', ARRAY_AGG(notifications.auxiliary_object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Created' AND
            notifications.object_class = 'CMA'
      ),
    'user_sent_message_ids', ARRAY_AGG(notifications.auxiliary_object) FILTER (
      WHERE notifications.subject_class = 'User' AND
            notifications.action = 'Sent' AND
            notifications.object_class = 'Message'
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
)
SELECT 'notification_summary' AS type,
       (SELECT COUNT(*) FROM tc)::int AS task_notification_count,
       (SELECT COUNT(*) FROM trc)::int AS transaction_notification_count,
       COUNT(r)::int AS room_notification_count,
       ((SELECT COUNT(*) FROM tc) + (SELECT COUNT(*) FROM trc) + COALESCE(ARRAY_LENGTH(ARRAY_AGG(r), 1), 0))::int AS total_notification_count,
       COALESCE((SELECT ARRAY_AGG(task) from tc), '{}'::uuid[]) AS task_ids,
       COALESCE((SELECT ARRAY_AGG(transaction) from trc), '{}'::uuid[]) AS transaction_ids,
       COALESCE(ARRAY_AGG(r), '{}'::json[]) AS room_notification_summaries
FROM rn
