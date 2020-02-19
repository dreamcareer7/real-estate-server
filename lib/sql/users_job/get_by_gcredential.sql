SELECT
  id
FROM
  users_jobs
WHERE
  AND google_credential = $1
  AND job_name = $2