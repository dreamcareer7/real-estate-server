SELECT 'email' AS type,
        email
FROM invitation_records
WHERE resource = $1
