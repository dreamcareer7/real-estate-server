SELECT photos.* FROM photos
JOIN listings on (photos.listing_mui = listings.matrix_unique_id)
WHERE last_processed IS NULL
ORDER BY matrix_unique_id DESC
LIMIT $1