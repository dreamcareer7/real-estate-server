SELECT
  users_jobs.*, 'users_jobs' AS type
FROM
  users_jobs
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(gcid, ord)
ON 
  users_jobs.id = gcid
ORDER BY 
  users_jobs.created_at DESC