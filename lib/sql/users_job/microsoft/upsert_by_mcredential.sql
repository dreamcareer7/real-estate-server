INSERT INTO users_jobs
  (
    "user",
    brand,
    google_credential,
    microsoft_credential,
    job_name,
    status,
    start_at,
    metadata,
    recurrence
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9
  )
ON CONFLICT (microsoft_credential, job_name) WHERE recurrence IS TRUE DO UPDATE SET
  status = $6,
  start_at = $7,
  updated_at = now(),
  resume_at = null
RETURNING id