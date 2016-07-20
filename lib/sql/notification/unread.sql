-- Online users get the notifications immediately on Websocket. Therefore, we dont send them push notifications immediately.
-- Results of this query are notifications that are *NOT* acknowledged by the user yet,
-- and we have not *NOT* pushed them yet, because they are already online.
-- 2 minutes is the window we give them to ack their notifications while they are online
-- Also if 30 minutes is passed and we still have not pushed them (for whatever issue), give up, its too late.

SELECT
  notifications_users."user",
  ARRAY_AGG(notifications_users.notification) as notifications
FROM notifications_users
LEFT OUTER JOIN notifications_deliveries
  ON notifications_users.notification = notifications_deliveries.notification
  AND notifications_users.user = notifications_deliveries.user
WHERE
  notifications_deliveries.notification IS NULL AND
  notifications_users.acked_at IS NULL
  AND notifications_users.created_at < (NOW() - '2 minute'::interval)
  AND notifications_users.created_at > (NOW() - '30 minute'::interval)
GROUP BY notifications_users."user"