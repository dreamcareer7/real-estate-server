UPDATE rooms_invitation_records
SET invited_user = $1
WHERE LOWER(email) = LOWER($2) AND
deleted_at IS NULL
