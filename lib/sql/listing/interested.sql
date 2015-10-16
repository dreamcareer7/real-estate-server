SELECT DISTINCT(recommendations.room) AS id
FROM recommendations
INNER JOIN recommendations_eav
ON recommendations.id = recommendations_eav.recommendation
WHERE recommendations.listing = $1 AND
      (recommendations_eav.action = 'Favorited' OR
       recommendations_eav.action = 'TourRequested')
