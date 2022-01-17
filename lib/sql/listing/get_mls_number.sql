SELECT id
FROM listings
WHERE mls_number = $1 AND deleted_at IS NULL
