SELECT
    *, 'microsoft_sync_history' AS type
FROM
    microsoft_sync_histories
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(glsh, ord)
ON 
    microsoft_sync_histories.id = glsh
ORDER BY 
    t.ord