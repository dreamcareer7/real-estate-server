UPDATE files_relations SET deleted_at = NOW()
WHERE id IN($1)
