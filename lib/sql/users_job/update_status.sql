UPDATE
  users_jobs
SET
  status = $2,
  start_at = now(),
  updated_at = now()
WHERE
  id = $1