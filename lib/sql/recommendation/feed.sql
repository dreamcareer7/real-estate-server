SELECT (COUNT(*) OVER())::INT AS full_count,
       id
FROM recommendations
WHERE recommendations.referring_user = $1
  AND recommendations.referred_shortlist = $2
  AND recommendations.status <> 'Favorited'
ORDER BY recommendations.created_at DESC LIMIT $3
OFFSET $4
