UPDATE
  users_jobs
SET
  deleted_at = now()
WHERE
  google_credential = $1