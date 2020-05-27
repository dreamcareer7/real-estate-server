SELECT
  id
FROM
  users_jobs 
WHERE
  google_credential = $1
  AND job_name = $2
  AND deleted_at IS NULL
FOR UPDATE SKIP LOCKED