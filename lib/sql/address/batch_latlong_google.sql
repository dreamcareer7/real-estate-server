SELECT id
FROM addresses
WHERE geocoded_google IS NOT TRUE AND
      corrupted_google IS NOT TRUE
ORDER BY created_at DESC
LIMIT $1
