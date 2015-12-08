UPDATE listings
SET cover_image_url = CASE WHEN $1::text IS NOT NULL THEN $1::text ELSE NULL END,
    gallery_image_urls = CASE WHEN ARRAY_LENGTH($2::text[], 1) > 0 THEN $2::text[] ELSE NULL END,
    photo_count = $3,
    updated_at = NOW()
WHERE matrix_unique_id = $4
