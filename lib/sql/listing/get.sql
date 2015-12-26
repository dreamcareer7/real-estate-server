SELECT 'listing' AS TYPE,
       listings.*,
       EXTRACT(EPOCH FROM listings.dom) AS dom,
       EXTRACT(EPOCH FROM listings.cdom) AS cdom,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
       (
        SELECT COALESCE(ARRAY_AGG(url), '{}'::text[]) FROM photos
        WHERE listing_mui = listings.matrix_unique_id AND photos.url IS NOT NULL
       ) as gallery_image_urls,
       (
        SELECT url FROM photos
        WHERE listing_mui = listings.matrix_unique_id AND photos.url IS NOT NULL
        ORDER BY "order" LIMIT 1
      ) as cover_image_url
FROM listings
WHERE listings.id = $1