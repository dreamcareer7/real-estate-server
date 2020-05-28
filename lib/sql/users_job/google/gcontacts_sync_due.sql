SELECT
  *
FROM
  users_jobs 
WHERE
  google_credential IS NOT NULL
  AND job_name = 'contacts'
  AND (start_at <= (NOW() - '6 hours'::interval) OR start_at IS NULL)
  AND deleted_at IS NULL
FOR UPDATE SKIP LOCKED