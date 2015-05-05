SELECT COUNT(*) AS total_count
FROM listings
WHERE CASE WHEN $1 = 'Any' THEN TRUE ELSE status = $1::listing_status END
