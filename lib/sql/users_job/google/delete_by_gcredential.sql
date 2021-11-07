UPDATE
  users_jobs
SET
  status = 'deleted',
  resume_at = null,
  deleted_at = now()
WHERE
  google_credential = $1