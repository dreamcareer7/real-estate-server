UPDATE
  calendar_notification_settings
SET
  deleted_at = NOW()
WHERE
  "user" = $1::uuid
  AND brand = $2::uuid
  AND id <> ALL($3::uuid[])
