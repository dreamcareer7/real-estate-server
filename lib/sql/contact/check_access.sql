SELECT COUNT(*) FROM contacts c
WHERE id IN (SELECT UNNEST($2::uuid[]))
AND c.user = $1
AND deleted_at IS NULL