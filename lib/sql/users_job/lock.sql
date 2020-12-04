SELECT
  *
FROM
  users_jobs
WHERE
  id = $1
  AND deleted_at IS NULL
FOR UPDATE