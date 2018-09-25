SELECT
  r.id
FROM
  reminders AS r
  LEFT JOIN notifications AS n
    ON r.id = n.subject
WHERE
  n.id IS NULL
  AND subject_class = 'Reminder'
  AND object_class = 'CrmTask'
  AND "object" = r.task
  AND r.deleted_at IS NULL
  AND r."timestamp" <  (now() + interval '20 seconds')
  AND r."timestamp" >= (now() - interval '2 hours')
