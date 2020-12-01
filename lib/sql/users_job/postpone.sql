UPDATE
  users_jobs
SET
  resume_at = (NOW() + $2::interval)
WHERE
  id = $1
  AND deleted_at IS NULL