SELECT
    *, 'microsoft_credential' AS type
FROM
    microsoft_credentials
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(mid, ord)
ON 
    microsoft_credentials.id = mid
ORDER BY 
    t.ord