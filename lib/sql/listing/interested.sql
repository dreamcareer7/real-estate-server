SELECT DISTINCT(recommendations.room) AS id
FROM recommendations
FULL JOIN recommendations_eav
ON recommendations.id = recommendations_eav.recommendation
FULL JOIN messages
ON recommendations.id = messages.recommendation
FULL JOIN notifications
ON recommendations.id = notifications.recommendation
WHERE
  recommendations.listing = $1
  AND
  (
    (recommendations_eav.action = 'Favorited' OR recommendations_eav.action = 'TourRequested')
    OR
    (messages.author IS NOT NULL)
    OR
    (notifications.subject_class = 'User' AND notifications.action = 'Shared' AND notifications.object_class = 'Listing')
  );