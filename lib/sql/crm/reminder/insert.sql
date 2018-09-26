INSERT INTO
  reminders (task, is_relative, "timestamp", needs_notification)
VALUES($1, $2, $3, $4)
RETURNING id
