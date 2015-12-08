UPDATE invitation_records
SET deleted_at = NOW()
WHERE id = $1
