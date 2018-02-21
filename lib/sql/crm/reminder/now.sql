SELECT
  id
FROM
  reminders
WHERE
  "notification" IS NULL
  AND deleted_at IS NULL
  AND "timestamp" <  (now() + interval '20 seconds')
  AND "timestamp" >= (now() - interval '2 hours')