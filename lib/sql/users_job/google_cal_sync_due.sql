SELECT
  id
FROM 
  users_jobs
WHERE
  (executed_at <= (NOW() - $1::interval) OR executed_at IS NULL)
  AND google_credential IS NOT NULL
  AND job_name IS 'calendar'
  AND status <> 'pending'
  AND deleted_at IS NULL