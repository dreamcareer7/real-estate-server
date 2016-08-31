WITH listing AS (
  SELECT 'listing' AS TYPE,
        listings.*,
        EXTRACT(EPOCH FROM listings.created_at) AS created_at,
        EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
        EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
        EXTRACT(EPOCH FROM listings.list_date) AS list_date,
        EXTRACT(EPOCH FROM listings.close_date) AS close_date,

        (
          SELECT id FROM agents WHERE matrix_unique_id = listings.list_agent_mui LIMIT 1
        ) as list_agent,

        (
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE (
             SELECT count(*) > 0 FROM recommendations
             LEFT JOIN recommendations_eav ON recommendations.id = recommendations_eav.recommendation
             WHERE recommendations.listing = $1
             AND recommendations_eav.user = $2
             AND recommendations_eav.action = 'Favorited'
          ) END
        ) as favorited,

        (
          SELECT COALESCE(ARRAY_AGG(url ORDER BY "order"), '{}'::text[]) FROM photos
          WHERE
          listing_mui = listings.matrix_unique_id
          AND photos.url IS NOT NULL
          AND photos.deleted_at IS NULL
        ) as gallery_image_urls,

        (
          SELECT url FROM photos
          WHERE
          listing_mui = listings.matrix_unique_id
          AND photos.url IS NOT NULL
          AND photos.deleted_at IS NULL
          ORDER BY "order" LIMIT 1
        ) as cover_image_url,

        (
          SELECT json_agg(a) FROM (
            SELECT
              id,
              type as open_house_type,
              'open_house' as type,
              EXTRACT(EPOCH FROM created_at) as created_at,
              EXTRACT(EPOCH FROM updated_at) as updated_at,
              EXTRACT(EPOCH FROM start_time) as start_time,
              EXTRACT(EPOCH FROM end_time)   as end_time,
              description
            FROM open_houses WHERE
            start_time > NOW() AND
            listing_mui = listings.matrix_unique_id
          ) AS a
        ) AS open_houses
  FROM listings
  WHERE listings.id = $1
),
property AS (
  SELECT 'property' AS TYPE,
        properties.*,
        EXTRACT(EPOCH FROM properties.created_at) AS created_at,
        EXTRACT(EPOCH FROM properties.updated_at) AS updated_at
  FROM properties
  JOIN listing ON properties.matrix_unique_id = listing.matrix_unique_id
),
address AS (
  SELECT addresses.*,
       'address' AS TYPE,
       (
        CASE WHEN location IS NULL THEN NULL ELSE
          json_build_object('type', 'location', 'longitude', ST_X(location), 'latitude', ST_Y(location))
        END
       ) as location,
       EXTRACT(EPOCH FROM addresses.created_at) AS created_at,
       EXTRACT(EPOCH FROM addresses.updated_at) AS updated_at
  FROM addresses
  JOIN listing ON listing.matrix_unique_id = addresses.matrix_unique_id
),
property_object AS (
  SELECT property.*, row_to_json(address) as address FROM property
  JOIN address ON property.matrix_unique_id = address.matrix_unique_id
)

SELECT listing.*, row_to_json(property_object) as property FROM listing
JOIN property_object ON listing.property_id = property_object.id
