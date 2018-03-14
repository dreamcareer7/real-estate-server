CREATE OR REPLACE VIEW unread_notifications AS
    SELECT
      notifications.*,
      notifications_users.user
    FROM notifications
    JOIN notifications_users      ON notifications.id = notifications_users.notification
    FULL JOIN
      notifications_deliveries ON
        notifications.id = notifications_deliveries.notification AND
        notifications_users.user = notifications_deliveries.user
    WHERE
      notifications_users.acked_at IS NULL
      AND notifications_deliveries.id IS NULL