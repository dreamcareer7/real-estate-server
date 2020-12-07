SELECT
    'microsoft_credential' AS type,
    microsoft_credentials.*,
    (SELECT ARRAY( SELECT id FROM users_jobs WHERE microsoft_credential = microsoft_credentials.id AND recurrence IS TRUE )) AS jobs
FROM
    microsoft_credentials
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(mid, ord)
ON 
    microsoft_credentials.id = mid
ORDER BY 
    t.ord