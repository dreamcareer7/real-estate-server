SELECT id FROM websites
WHERE "user" = $1 AND deleted_at IS NULL
