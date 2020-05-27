-- deprecated, we use users_jobs row level lock technique

SELECT
  id
FROM 
  users_jobs
WHERE
  (executed_at <= (NOW() - $1::interval) OR executed_at IS NULL)
  AND microsoft_credential IS NOT NULL
  AND job_name = 'calendar'
  AND status <> 'pending'
  AND deleted_at IS NULL