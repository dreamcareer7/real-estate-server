SELECT
  *
FROM
  users_jobs 
WHERE
  google_credential IS NOT NULL
  AND job_name = 'calendar'
  AND ((start_at <= (NOW() - $1::interval) OR start_at IS NULL) OR status = 'waiting')
  AND ((resume_at <= NOW()) OR (resume_at IS null))
  AND recurrence IS TRUE
  AND deleted_at IS NULL
  -- Don't requeue anything that has been queued.
  -- However, there is a chance that we had queued something, but the queue has got purged or anything and it was never processed.
  -- So, if after 3 hours, it's still not processed, queue again
  AND (status <> 'queued' OR updated_at > (NOW() - '3 hour'::interval))
FOR UPDATE SKIP LOCKED