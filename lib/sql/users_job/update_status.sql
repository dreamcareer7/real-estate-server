UPDATE
  users_jobs
SET
  status = $2,
  start_at = COALESCE($3, start_at),
  updated_at = now()
WHERE
  id = $1