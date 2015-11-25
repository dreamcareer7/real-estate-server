SELECT *,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       'email_verification' AS type
FROM email_verifications
WHERE id = $1
