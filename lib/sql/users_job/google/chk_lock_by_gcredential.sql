SELECT
  id
FROM
  users_jobs 
WHERE
  google_credential = $1
  AND job_name = 'calendar'
  AND deleted_at IS NULL
FOR UPDATE SKIP LOCKED