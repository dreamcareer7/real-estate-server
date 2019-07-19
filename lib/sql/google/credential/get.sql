SELECT
    'google_credential' AS type,
    google_credentials.*,
    (SELECT ARRAY_AGG(id) FROM google_sync_histories WHERE google_credential = google_credentials.id LIMIT 5 ) AS histories
FROM
    google_credentials
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gid, ord)
ON 
    google_credentials.id = gid
ORDER BY 
    t.ord