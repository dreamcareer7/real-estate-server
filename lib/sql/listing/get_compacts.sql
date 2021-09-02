WITH brand_agents AS (
  SELECT * FROM propose_brand_agents($3, $2)
  WHERE $4::text[] @> ARRAY['compact_listing.proposed_agent']
),
listing_settings AS (
  SELECT id, listing from user_listing_notification_settings 
  WHERE "user" = $2 AND
  listing = ANY($1)
)

SELECT 'compact_listing' AS TYPE,
       listings.id AS id,
       listings.mls,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
       EXTRACT(EPOCH FROM listings.close_date) AS close_date,
       listings.price AS price,
       listings.close_price AS close_price,
       listings.status AS status,
       listings.mls_number AS mls_number,
       listings.buyers_agency_commission AS buyers_agency_commission,
       listings.sub_agency_commission AS sub_agency_commission,
       (
          SELECT id FROM agents
          WHERE  agents.matrix_unique_id = listings.list_agent_mui
          AND    agents.mls = listings.mls
          LIMIT 1
       ) as list_agent,
       (
          SELECT id FROM agents
          WHERE  agents.matrix_unique_id = listings.selling_agent_mui
          AND    agents.mls = listings.mls
          LIMIT 1
       ) as selling_agent,
       list_office_name,
       selling_office_name,
       list_agent_mls_id,
       list_agent_email,
       list_agent_full_name,
       list_agent_direct_work_phone,
       co_list_agent_mls_id,
       selling_agent_mls_id,
       selling_agent_email,
       selling_agent_full_name,
       selling_agent_direct_work_phone,
       co_selling_agent_mls_id,
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
       (
        CASE WHEN $2::uuid IS NULL THEN FALSE ELSE (
            SELECT count(*) > 0 FROM recommendations
            JOIN recommendations_eav ON recommendations.id = recommendations_eav.recommendation
            WHERE recommendations.listing = listings.id
            AND recommendations_eav.user = $2
            AND recommendations_eav.action = 'Favorited'
        ) END
      ) as favorited,
       CASE WHEN addresses.location IS NOT NULL THEN
       json_build_object(
          'latitude', ST_Y(addresses.location),
          'longitude', ST_X(addresses.location),
          'type', 'location'
       ) ELSE NULL END AS location,
       (
         SELECT url FROM photos
         WHERE
          listing_mui = listings.matrix_unique_id
          AND mls = listings.mls
          AND photos.url IS NOT NULL
          AND photos.deleted_at IS NULL
         ORDER BY "order" LIMIT 1
       ) as cover_image_url,
       (
          SELECT COALESCE(ARRAY_AGG(url ORDER BY "order"), '{}'::text[]) FROM photos
          WHERE photos.listing_mui = listings.matrix_unique_id
          AND   photos.mls = listings.mls
          AND   photos.url IS NOT NULL
          AND   photos.deleted_at IS NULL
        ) as gallery_image_urls,
       json_build_object(
          'type', 'compact_address',
          'street_number', addresses.street_number,
          'street_name', addresses.street_name,
          'city', addresses.city,
          'state', addresses.state_code,
          'postal_code', addresses.postal_code,
          'neighborhood', addresses.neighborhood,
          'street_suffix', addresses.street_suffix,
          'unit_number', addresses.unit_number,
          'country', addresses.country,
          'country_code', addresses.country_code,
          'street_dir_prefix', addresses.street_dir_prefix,
          'street_dir_suffix', addresses.street_dir_suffix,
          'created_at', EXTRACT(EPOCH FROM addresses.created_at),
          'updated_at', EXTRACT(EPOCH FROM addresses.updated_at),

          'street_address',
          (
            SELECT ARRAY_TO_STRING
            (
              array_remove(ARRAY[
                street_number,
                street_dir_prefix,
                street_name,
                street_suffix,
                street_dir_suffix,
                CASE
                  WHEN addresses.unit_number IS NULL THEN NULL
                  WHEN addresses.unit_number = '' THEN NULL
                  ELSE 'Unit ' || addresses.unit_number END
              ], NULL), ' ', NULL
            )
          )
       ) AS address,
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
           FROM open_houses
           WHERE open_houses.listing_mui = listings.matrix_unique_id
             AND open_houses.mls = listings.mls
             AND open_houses.end_time::timestamptz AT TIME ZONE tz > NOW()
         ) AS a
       ) AS open_houses,
       json_build_object(
          'type', 'compact_property',
          'property_type', properties.property_type,
          'property_subtype', properties.property_subtype,
          'half_bathroom_count', properties.half_bathroom_count,
          'full_bathroom_count', properties.full_bathroom_count,
          'square_meters', properties.square_meters,
          'bedroom_count', properties.bedroom_count,
          'bathroom_count', properties.bathroom_count,
          'year_built', properties.year_built,
          'number_of_units', properties.number_of_units,
          'lot_size_dimensions', properties.lot_size_dimensions,
          'lot_square_meters', properties.lot_square_meters,
          'lot_size_area', properties.lot_size_area,
          'description', properties.description,
          'created_at', EXTRACT(EPOCH FROM properties.created_at),
          'updated_at', EXTRACT(EPOCH FROM properties.updated_at)
       ) AS compact_property,
       listing_settings.id as user_listing_notification_setting

FROM listings
LEFT JOIN listing_settings ON (listing_settings.listing = listings.id)
JOIN properties ON listings.property_id = properties.id
JOIN addresses ON properties.address_id = addresses.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(lid, ord) ON listings.id = lid
ORDER BY t.ord
