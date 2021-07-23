INSERT INTO notifications_tokens
  ("user", channel, app)
VALUES
  ($1, $2, $3::notification_app)
ON CONFLICT (channel)
DO
 UPDATE
   SET "user" = $1,
       app = $3::notification_app;
