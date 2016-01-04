SELECT 'compact_listing' AS TYPE,
       listings.id AS id,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
       listings.price AS price,
       listings.status AS status,
       listings.mls_number AS mls_number,
       json_build_object(
          'latitude', ST_Y(addresses.location),
          'longitude', ST_X(addresses.location),
          'type', 'location'
       ) AS location,
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
       ) AS address
FROM listings
JOIN properties ON listings.property_id = properties.id
JOIN addresses ON properties.address_id = addresses.id
WHERE listings.id = ANY($1::uuid[])
