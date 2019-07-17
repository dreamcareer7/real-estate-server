SELECT
    'microsoft_credential' AS type,
    microsoft_credentials.*,
    (SELECT ARRAY_AGG(id) FROM microsoft_sync_histories WHERE microsoft_credential = microsoft_credentials.id LIMIT 5 ) AS histories
FROM
    microsoft_credentials
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(mid, ord)
ON 
    microsoft_credentials.id = mid
ORDER BY 
    t.ord