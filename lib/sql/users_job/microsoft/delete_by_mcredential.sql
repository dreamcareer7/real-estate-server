UPDATE
  users_jobs
SET
  status = null,
  deleted_at = now()
WHERE
  microsoft_credential = $1