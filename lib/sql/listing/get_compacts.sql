SELECT 'compact_listing' AS TYPE,
       listings.id AS id,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
       (CASE WHEN LENGTH(close_date) > 0 THEN EXTRACT(EPOCH FROM close_date::timestamp) ELSE NULL END) as close_date,
       listings.price AS price,
       listings.status AS status,
       listings.mls_number AS mls_number,
       CASE WHEN addresses.location IS NOT NULL THEN
       json_build_object(
          'latitude', ST_Y(addresses.location),
          'longitude', ST_X(addresses.location),
          'type', 'location'
       ) ELSE NULL END AS location,
       (
         SELECT url FROM photos
         WHERE listing_mui = listings.matrix_unique_id AND photos.url IS NOT NULL
         ORDER BY "order" LIMIT 1
       ) as cover_image_url,
       json_build_object(
          'type', 'compact_address',
          'street_number', addresses.street_number,
          'street_name', addresses.street_name,
          'city', addresses.city,
          'state', addresses.state,
          'postal_code', addresses.postal_code,
          'neighborhood', addresses.neighborhood,
          'street_suffix', addresses.street_suffix,
          'unit_number', addresses.unit_number,
          'country', addresses.country,
          'country_code', addresses.country_code,
          'street_dir_prefix', addresses.street_dir_prefix,
          'street_dir_suffix', addresses.street_dir_suffix,
          'created_at', EXTRACT(EPOCH FROM addresses.created_at),
          'updated_at', EXTRACT(EPOCH FROM addresses.updated_at)
       ) AS address,
       (
         SELECT json_agg(a) FROM (
           SELECT
            type as open_house_type,
            'open_house' as type,
            EXTRACT(EPOCH FROM created_at) as created_at,
            EXTRACT(EPOCH FROM updated_at) as updated_at,
            EXTRACT(EPOCH FROM start_time) as start_time,
            EXTRACT(EPOCH FROM end_time)   as end_time
            ,description
           FROM open_houses WHERE listing_mui = listings.matrix_unique_id AND start_time > NOW()
         ) AS a
       ) AS open_houses,
       json_build_object(
          'type', 'compact_property',
          'half_bathroom_count', properties.half_bathroom_count,
          'full_bathroom_count', properties.full_bathroom_count,
          'square_meters', properties.square_meters,
          'bedroom_count', properties.bedroom_count,
          'created_at', EXTRACT(EPOCH FROM properties.created_at),
          'updated_at', EXTRACT(EPOCH FROM properties.updated_at)
       ) AS compact_property
FROM listings
JOIN properties ON listings.property_id = properties.id
JOIN addresses ON properties.address_id = addresses.id
WHERE listings.id = ANY($1::uuid[])
