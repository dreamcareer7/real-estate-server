INSERT INTO users_jobs
  (
    "user",
    brand,
    google_credential,
    microsoft_credential,
    job_name,
    status
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
  )
ON CONFLICT (google_credential, job_name) DO UPDATE SET
  status = $6,
  start_at = now(),
  end_at = null,
  updated_at = now()
RETURNING id