SELECT
    *, 'google_sync_history' AS type
FROM
    google_sync_histories
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(glsh, ord)
ON 
    google_sync_histories.id = glsh
ORDER BY 
    t.ord