SELECT 'listing' AS TYPE,
       listings.*,
       EXTRACT(EPOCH FROM listings.dom) AS dom,
       EXTRACT(EPOCH FROM listings.cdom) AS cdom,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
       (
        SELECT ARRAY_AGG(url) FROM photos
        WHERE listing_mui = listings.matrix_unique_id
       ) as gallery_image_urls,

       (
        SELECT url FROM photos
        WHERE listing_mui = listings.matrix_unique_id
        ORDER BY "order" LIMIT 1
      ) as cover_image_url,

      (
        SELECT json_agg(a) FROM (
          SELECT
            start_time,end_time,type,description
          FROM open_houses WHERE listing_mui = listings.matrix_unique_id
        ) AS a
      ) AS open_houses

FROM listings
WHERE listings.id = $1