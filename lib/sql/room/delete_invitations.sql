UPDATE invitation_records
SET deleted_at = NOW()
WHERE room = $1
