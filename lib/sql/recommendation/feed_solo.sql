SELECT id
FROM recommendations
WHERE recommendations.referring_user = $1
AND recommendations.status = 'Unacknowledged'
AND CASE
    WHEN $2 = 'Since' THEN uuid_timestamp(id) > uuid_timestamp($3)
    WHEN $2 = 'Max' THEN uuid_timestamp(id) < uuid_timestamp($3)
    ELSE TRUE
    END
ORDER BY
    CASE WHEN $4 THEN created_at END,
    CASE WHEN NOT $4 THEN created_at END DESC
LIMIT $5;
