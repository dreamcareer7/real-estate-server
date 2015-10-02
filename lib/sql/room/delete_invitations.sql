UPDATE rooms_invitation_records
SET deleted_at = NOW()
WHERE room = $1
