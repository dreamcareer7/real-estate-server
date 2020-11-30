UPDATE
  users_jobs
SET
  status = 'canceled',
  resume_at = null,
  deleted_at = now()
WHERE
  google_credential = $1
  AND job_name = $2