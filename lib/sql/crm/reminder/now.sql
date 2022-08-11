SELECT
  r.id
FROM
  reminders r
  JOIN crm_tasks t
    ON r.task = t.id
  JOIN brands b
    ON t.brand = b.id
WHERE
  r.needs_notification IS True
  AND r.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND r.timestamp <  (now() + interval '20 seconds')
  AND r.timestamp >= (now() - interval '2 hours')
