UPDATE
  users_jobs
SET
  status = $3,
  end_at = now(),
  updated_at = now()
WHERE
  AND google_credential = $1
  AND job_name = $2