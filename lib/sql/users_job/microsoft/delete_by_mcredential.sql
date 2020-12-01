UPDATE
  users_jobs
SET
  status = null,
  resume_at = null,
  deleted_at = now()
WHERE
  microsoft_credential = $1