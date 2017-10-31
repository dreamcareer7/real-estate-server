SELECT id FROM brands
WHERE
parent = $1
AND deleted_at IS NULL