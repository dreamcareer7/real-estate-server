SELECT (COUNT(*) OVER())::INT AS full_count,
       id
FROM recommendations
WHERE recommendations.referring_user = $1
  AND recommendations.status <> 'Favorited'
ORDER BY recommendations.created_at DESC LIMIT $2
OFFSET $3
