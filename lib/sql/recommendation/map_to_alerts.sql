WITH f AS (
  SELECT DISTINCT(UNNEST(recommendations.referring_objects)) AS r
  FROM recommendations
  WHERE id = ANY($1)
)
SELECT r FROM f INNER JOIN alerts ON alerts.id = r
