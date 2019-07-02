SELECT
    *, 'google_credential' AS type
FROM
    google_credentials
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gid, ord)
ON 
    google_credentials.id = gid
ORDER BY 
    t.ord