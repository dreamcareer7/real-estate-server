UPDATE invitation_records
SET referring_user = $1
WHERE email = $2
