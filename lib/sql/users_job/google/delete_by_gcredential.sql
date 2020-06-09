UPDATE
  users_jobs
SET
  status = null,
  deleted_at = now()
WHERE
  google_credential = $1