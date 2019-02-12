SELECT
  id,
  EXTRACT(epoch FROM created_at),
  EXTRACT(epoch FROM updated_at),
  object_type,
  event_type,
  EXTRACT(epoch FROM reminder) AS reminder,
  'calendar_notification_setting' AS type
FROM
  calendar_notification_settings
WHERE
  deleted_at IS NULL
  AND "user" = $1::uuid
