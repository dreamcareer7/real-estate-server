INSERT INTO
  reminders (task, is_relative, "timestamp")
VALUES($1, $2, $3)
RETURNING id