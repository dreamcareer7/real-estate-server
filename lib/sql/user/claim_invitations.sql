UPDATE invitation_records
SET invited_user = $1
WHERE email = $2
