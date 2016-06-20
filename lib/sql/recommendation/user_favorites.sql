SELECT DISTINCT listings.mls_number FROM recommendations_eav
JOIN recommendations ON recommendations_eav.recommendation = recommendations.id
JOIN listings ON recommendations.listing = listings.id
WHERE
  recommendations_eav.user = $1
  AND recommendations_eav.action = 'Favorited'
  AND recommendations.deleted_at IS NULL;