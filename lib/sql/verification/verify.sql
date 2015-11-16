SELECT *,
       'verification' AS type
FROM verifications
WHERE code = $1 AND user_id = $2
