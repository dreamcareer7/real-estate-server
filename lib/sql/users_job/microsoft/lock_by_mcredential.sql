SELECT
  *
FROM
  users_jobs
WHERE
  microsoft_credential = $1
  AND job_name = $2
  AND deleted_at IS NULL
FOR UPDATE