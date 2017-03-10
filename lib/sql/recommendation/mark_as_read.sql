WITH u AS
(
  SELECT recommendations.id AS id
  FROM recommendations
  LEFT JOIN recommendations_eav
  ON recommendations.id = recommendations_eav.recommendation AND
     recommendations_eav."user" = $1 AND
     recommendations_eav.action = 'Read'
  WHERE recommendations.room = $2 AND
        recommendations_eav.id IS NULL AND
        CASE WHEN $3::uuid IS NULL THEN TRUE ELSE $3 = ANY(recommendations.referring_objects) END
)
INSERT INTO recommendations_eav(
  "user",
  action,
  recommendation
)
SELECT $1, 'Read', id
FROM u
ON CONFLICT DO NOTHING
