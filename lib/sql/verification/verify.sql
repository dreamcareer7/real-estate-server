SELECT *
FROM verification_codes
WHERE code = $1 AND user_id = $2
