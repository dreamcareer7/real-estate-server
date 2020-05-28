SELECT
  *
FROM
  users_jobs 
WHERE
  microsoft_credential IS NOT NULL
  AND job_name = 'contacts'
  AND (start_at <= (NOW() - $1::interval) OR start_at IS NULL)
  AND deleted_at IS NULL
FOR UPDATE SKIP LOCKED