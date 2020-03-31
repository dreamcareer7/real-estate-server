SELECT
  id
FROM
  users_jobs
WHERE
  microsoft_credential = $1
  AND job_name = $2