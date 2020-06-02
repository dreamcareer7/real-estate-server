INSERT INTO users_jobs
  (
    "user",
    brand,
    google_credential,
    microsoft_credential,
    job_name,
    status,
    start_at
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
  )
ON CONFLICT (google_credential, job_name) DO UPDATE SET
  status = $6,
  start_at = $7,
  updated_at = now(),
  deleted_at = null
RETURNING id