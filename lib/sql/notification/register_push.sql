INSERT INTO notifications_tokens
  ("user", channel)
VALUES
  ($1, $2)
ON CONFLICT (channel)
DO
 UPDATE
   SET "user" = $1;