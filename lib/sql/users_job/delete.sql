UPDATE
  users_jobs
SET
  deleted_at = now()
WHERE
  id = $1