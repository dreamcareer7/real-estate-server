SELECT
  *
FROM
  users_jobs 
WHERE
  microsoft_credential IS NOT NULL
  AND job_name = 'contact_avatar'
  AND ((start_at <= (NOW() - $1::interval) OR start_at IS NULL) OR status = 'waiting')
  AND ((resume_at <= NOW()) OR (resume_at IS null))
  AND recurrence IS FALSE
  AND deleted_at IS NULL
FOR UPDATE SKIP LOCKED