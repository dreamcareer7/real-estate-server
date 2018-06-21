CREATE OR REPLACE VIEW new_notifications AS
  SELECT
    notifications.*,
    notifications_users.user as "user"
  FROM notifications
  JOIN
    notifications_users ON notifications.id = notifications_users.notification
  WHERE
  notifications_users.acked_at IS NULL
