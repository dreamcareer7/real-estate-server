UPDATE
  users_jobs
SET
  resume_at = (NOW() + $3::interval)
WHERE
  microsoft_credential = $1 AND job_name = $2 AND deleted_at IS NULL