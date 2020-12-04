UPDATE
  users_jobs
SET
  deleted_at = now(),
  resume_at = null
WHERE
  id = $1