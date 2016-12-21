SELECT id FROM deals
WHERE deleted_at IS NULL AND created_by = $1
ORDER BY updated_at DESC