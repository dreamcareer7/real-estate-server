SELECT id
FROM recommendations
WHERE recommendations.referring_user = $1
  AND recommendations.referred_shortlist = $2
  AND recommendations.status = 'Unacknowledged'
AND CASE
    WHEN $3 = 'Since' THEN uuid_timestamp(id) > uuid_timestamp($4)
    WHEN $3 = 'Max' THEN uuid_timestamp(id) < uuid_timestamp($4)
    ELSE TRUE
    END
ORDER BY
    CASE WHEN $5 THEN created_at END,
    CASE WHEN NOT $5 THEN created_at END DESC
LIMIT $6;
