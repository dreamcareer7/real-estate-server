INSERT INTO notifications_users
  (notification, "user", sms_message, push_message, message)
  VALUES
  ($1, $2, $3, $4, $5)
RETURNING *