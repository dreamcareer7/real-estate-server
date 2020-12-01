SELECT
  users_jobs.*, 'users_jobs' AS type
FROM
  users_jobs
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(ucid, ord)
ON 
  users_jobs.id = ucid
ORDER BY 
  users_jobs.created_at DESC