UPDATE listings
SET cover_image_url = $1,
    gallery_image_urls = $2,
    photo_count = $3,
    updated_at = NOW()
WHERE matrix_unique_id = $4
