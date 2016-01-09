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
       ) as cover_image_url,

       (
         SELECT json_agg(a) FROM (
           SELECT
            'type' as open_house_type,
            'open_house' as type,
            EXTRACT(EPOCH FROM created_at) as created_at,
            EXTRACT(EPOCH FROM updated_at) as updated_at,
            EXTRACT(EPOCH FROM start_time) as start_time,
            EXTRACT(EPOCH FROM end_time)   as end_time
            ,description
           FROM open_houses WHERE
           start_time > NOW() AND
           listing_mui = listings.matrix_unique_id
         ) AS a
       ) AS open_houses
FROM listings
WHERE listings.id = $1
