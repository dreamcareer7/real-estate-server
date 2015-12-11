SELECT matrix_unique_id
FROM listings
WHERE photo_count > ARRAY_LENGTH(gallery_image_urls, 1)
ORDER BY updated_at
LIMIT $1
