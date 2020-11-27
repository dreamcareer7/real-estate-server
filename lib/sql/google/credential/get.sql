SELECT
    'google_credential' AS type,
    google_credentials.*,
    (SELECT ARRAY( SELECT id FROM users_jobs WHERE google_credential = google_credentials.id AND job_name <> 'gmail_query' )) AS jobs
FROM
    google_credentials
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gid, ord)
ON 
    google_credentials.id = gid
ORDER BY 
    t.ord