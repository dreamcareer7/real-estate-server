WITH my_rooms AS(
  SELECT DISTINCT ON(rooms_users.room) rooms_users.room FROM rooms_users
  JOIN rooms ON rooms_users.room = rooms.id
  WHERE
  rooms.deleted_at IS NULL
  AND (
    CASE WHEN $1::uuid IS NULL THEN TRUE ELSE rooms_users.user = $1::uuid END
  )
  AND (
    CASE WHEN $2::uuid IS NULL THEN TRUE ELSE rooms.id = $2::uuid END
  )
),

recommeded_manually AS (
  SELECT DISTINCT ON(recommendation)
    recommendation
  FROM notifications
  WHERE
    deleted_at IS NULL
    AND room IN(SELECT * FROM my_rooms)
    AND subject_class = 'User' AND action = 'Shared' AND object_class = 'Listing'
),

has_comment AS (
  SELECT DISTINCT ON (recommendation)
  recommendation
  FROM messages
  JOIN recommendations ON messages.recommendation = recommendations.id
  WHERE
    messages.author IS NOT NULL
    AND recommendations.room IN(SELECT * FROM my_rooms)
),

favorited AS (
  SELECT DISTINCT ON (recommendation)
  recommendations.id
  FROM recommendations
  JOIN recommendations_eav ON recommendations.id = recommendations_eav.recommendation
  WHERE
    recommendations.room IN(SELECT * FROM my_rooms)
    AND action = 'Favorited'
),

summarized AS (
  SELECT * FROM recommeded_manually
  UNION
  SELECT * FROM has_comment
  UNION
  SELECT * FROM favorited
),

recs AS (
  SELECT id, created_at, updated_at FROM recommendations
  WHERE id IN(SELECT recommendation FROM summarized) AND hidden = false
)

SELECT id,
       (COUNT(*) OVER())::INT AS total,
       LOWER($3)
FROM recs
WHERE
CASE
    WHEN $4 = 'Since_C' THEN created_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Max_C' THEN created_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Since_U' THEN updated_at > TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Max_U' THEN updated_at <= TIMESTAMP WITH TIME ZONE 'EPOCH' + $5 * INTERVAL '1 MICROSECOND'
    WHEN $4 = 'Init_C' THEN created_at <= NOW()
    WHEN $4 = 'Init_U' THEN updated_at <= NOW()
    ELSE TRUE
    END
ORDER BY
    CASE $4
        WHEN 'Since_C' THEN created_at
        WHEN 'Since_U' THEN updated_at
    END,
    CASE $4
        WHEN 'Max_C' THEN created_at
        WHEN 'Max_U' THEN updated_at
        WHEN 'Init_C' THEN created_at
        WHEN 'Init_U' THEN updated_at
    END DESC
LIMIT $6;
