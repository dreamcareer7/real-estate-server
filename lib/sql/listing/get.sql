WITH brand_agents AS (
  SELECT * FROM propose_brand_agents($3, $2)
  WHERE $4::text[] @> ARRAY['listing.proposed_agent']
),
listing_settings AS (
  SELECT id, listing from user_listing_notification_settings 
  WHERE "user" = $2 AND
  listing = ANY($1)
)
,listing AS (
  SELECT 'listing' AS TYPE,
        listings.*,
        COALESCE(
          listings.list_office_name,
          (
            SELECT name FROM offices
            WHERE offices.matrix_unique_id = listings.list_office_mui
            AND   offices.mls = listings.mls
            LIMIT 1
          )
        ) AS list_office_name,
        (
          SELECT "user" FROM brand_agents
          ORDER BY (
            CASE
              WHEN listings.list_agent_mui       = brand_agents.mui AND listings.mls = brand_agents.mls THEN 4
              WHEN listings.co_list_agent_mui    = brand_agents.mui AND listings.mls = brand_agents.mls THEN 3
              WHEN listings.selling_agent_mui    = brand_agents.mui AND listings.mls = brand_agents.mls THEN 2
              WHEN listings.co_selling_agent_mui = brand_agents.mui AND listings.mls = brand_agents.mls THEN 1
              ELSE 0
            END
          ) DESC, is_me DESC, has_contact DESC, RANDOM()
          LIMIT 1
        ) as proposed_agent,
        EXTRACT(EPOCH FROM listings.created_at) AS created_at,
        EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
        EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
        EXTRACT(EPOCH FROM listings.list_date) AS list_date,
        EXTRACT(EPOCH FROM listings.close_date) AS close_date,
        (
          SELECT id FROM agents
          WHERE agents.matrix_unique_id = listings.list_agent_mui
          AND   agents.mls = listings.mls
          LIMIT 1
        ) as list_agent,
        (
          SELECT id FROM offices
          WHERE offices.matrix_unique_id = listings.list_office_mui
          AND   offices.mls = listings.mls
          AND   offices.status = 'Active'
          LIMIT 1
        ) as list_office,
        (
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE (
             SELECT count(*) > 0 FROM recommendations
             LEFT JOIN recommendations_eav ON recommendations.id = recommendations_eav.recommendation
             WHERE recommendations.listing = listings.id
             AND recommendations_eav.user = $2
             AND recommendations_eav.action = 'Favorited'
          ) END
        ) as favorited,
        (
          SELECT COALESCE(ARRAY_AGG(url ORDER BY "order"), '{}'::text[]) FROM photos
          WHERE photos.listing_mui = listings.matrix_unique_id
          AND   photos.mls = listings.mls
          AND   photos.url IS NOT NULL
          AND   photos.deleted_at IS NULL
        ) as gallery_image_urls,
        (
          SELECT url FROM photos
          WHERE photos.listing_mui = listings.matrix_unique_id
          AND   photos.mls = listings.mls
          AND   photos.url IS NOT NULL
          AND   photos.deleted_at IS NULL
          ORDER BY "order" LIMIT 1
        ) as cover_image_url,
        (
          SELECT json_agg(a) FROM (
            SELECT
              id,
              type as open_house_type,
              'open_house' as type,
              EXTRACT(EPOCH FROM created_at) AS created_at,
              EXTRACT(EPOCH FROM updated_at) AS updated_at,
              EXTRACT(EPOCH FROM start_time) AS start_time,
              EXTRACT(EPOCH FROM end_time) AS end_time,
              tz,
              description
            FROM open_houses
            WHERE open_houses.listing_mui = listings.matrix_unique_id
              AND open_houses.mls = listings.mls
              AND open_houses.end_time::timestamptz AT TIME ZONE tz > NOW()
          ) AS a
        ) AS open_houses
  FROM listings
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(lid, ord) ON listings.id = lid
  ORDER BY t.ord
),
property AS (
  SELECT 'property' AS TYPE,
        properties.*,
        EXTRACT(EPOCH FROM properties.created_at) AS created_at,
        EXTRACT(EPOCH FROM properties.updated_at) AS updated_at
  FROM properties
  JOIN listing ON listing.property_id = properties.id
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
       EXTRACT(EPOCH FROM addresses.updated_at) AS updated_at,
       (
        SELECT ARRAY_TO_STRING
        (
          ARRAY[
            addresses.street_number,
            addresses.street_dir_prefix,
            addresses.street_name,
            addresses.street_suffix,
            CASE
              WHEN addresses.unit_number IS NULL THEN NULL
              WHEN addresses.unit_number = '' THEN NULL
              ELSE 'Unit ' || addresses.unit_number || ',' END,
            addresses.city || ',',
            addresses.state_code,
            addresses.postal_code
          ], ' ', NULL
        )
      ) AS full_address,
      (
        SELECT ARRAY_TO_STRING
        (
          ARRAY[
            addresses.street_number,
            addresses.street_dir_prefix,
            addresses.street_name,
            addresses.street_suffix,
            CASE
              WHEN addresses.unit_number IS NULL THEN NULL
              WHEN addresses.unit_number = '' THEN NULL
              ELSE 'Unit ' || addresses.unit_number END
          ], ' ', NULL
        )
      ) AS street_address
  FROM addresses
  JOIN property ON property.address_id = addresses.id
),
property_object AS (
  SELECT property.*, row_to_json(address) as address FROM property
  JOIN address ON property.address_id = address.id
)

SELECT listing.*, row_to_json(property_object) as property, listing_settings.id as user_listing_notification_setting
FROM listing
LEFT JOIN listing_settings ON (listing_settings.listing = listing.id)
JOIN property_object ON listing.property_id = property_object.id
