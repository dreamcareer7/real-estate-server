UPDATE
  reminders
SET
  "timestamp" = t_reminders.timestamp,
  updated_at = now(),
  needs_notification = (CASE
    WHEN t_reminders.timestamp <> reminders."timestamp" THEN
      t_reminders.timestamp > now()
    ELSE
      reminders.needs_notification
    END) AND t_reminders.needs_notification
FROM
  json_to_recordset($1::json) AS t_reminders ( id uuid, "timestamp" timestamptz, needs_notification boolean)
WHERE
  reminders.id = t_reminders.id
