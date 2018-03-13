SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  is_relative,
  EXTRACT(EPOCH FROM "timestamp") AS "timestamp",
  task,
  "notification",
  'reminder' as "type"
FROM
  reminders
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON reminders.id = did
ORDER BY t.ord
