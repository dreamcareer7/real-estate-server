SELECT
COUNT(*) OVER() AS full_count,
contact_id
FROM contacts
WHERE
  user_id = $1
ORDER BY created_at DESC
LIMIT $2
OFFSET $3
