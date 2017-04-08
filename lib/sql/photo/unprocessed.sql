SELECT photos.* FROM photos
JOIN listings on (photos.listing_mui = listings.matrix_unique_id)
WHERE to_be_processed_at <= NOW()
LIMIT $1