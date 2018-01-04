CREATE OR REPLACE FUNCTION get_new_notifications(room_ids uuid[], user_id uuid) RETURNS TABLE (
   "notification" uuid,
   "room" uuid
) AS
$$
  SELECT
    notifications.id as notification,
    notifications.room as room
  FROM notifications
  JOIN
    notifications_users ON notifications.id = notifications_users.notification
  WHERE
    notifications.room = ANY(room_ids)
    AND COALESCE(NOT (user_id = ANY(notifications.exclude)), TRUE)
    AND notifications_users.user = user_id
    AND notifications_users.acked_at IS NULL
$$
LANGUAGE sql;

