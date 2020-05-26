SELECT
  *
FROM
  users_jobs
WHERE
  microsoft_credential = $1
  AND job_name = 'calendar'
  AND deleted_at IS NULL
FOR UPDATE