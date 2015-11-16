SELECT *,
       'verification' AS type
FROM verifications
WHERE id = $1
