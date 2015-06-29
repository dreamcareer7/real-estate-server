SELECT id
FROM addresses
WHERE geocoded_google IS TRUE AND
      geocoded_bing IS NOT TRUE AND
      geo_confidence_google <> 'ROOFTOP' AND
      corrupted_bing IS NOT TRUE
ORDER BY created_at DESC
LIMIT $1
