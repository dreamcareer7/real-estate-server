UPDATE invitation_records
SET accepted = $2
WHERE id = $1
