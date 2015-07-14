SELECT 'email' AS type,
        email,
        inviting_user,
        invited_user
FROM invitation_records
WHERE resource = $1
