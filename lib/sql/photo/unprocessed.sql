SELECT photos.* FROM photos
WHERE to_be_processed_at <= NOW()
LIMIT $1