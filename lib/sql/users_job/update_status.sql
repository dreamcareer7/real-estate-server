UPDATE
  users_jobs
SET
  status = $2,
  start_at = $3,
  updated_at = now()
WHERE
  id = $1