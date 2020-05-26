UPDATE
  users_jobs
SET
  deleted_at = now()
WHERE
  microsoft_credential = $1