UPDATE files_relations SET deleted_at = NOW()
WHERE file = $1 AND role = $2 AND role_id = $3
