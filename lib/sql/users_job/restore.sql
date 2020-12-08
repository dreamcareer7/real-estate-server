UPDATE
  users_jobs
SET
  status = null,
  start_at = null,
  deleted_at = null,
  resume_at = null
WHERE
  id = $1