SELECT *,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       'phone_verification' AS type
FROM phone_verifications
WHERE id = $1
