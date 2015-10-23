SELECT 'compact_listing' AS TYPE,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
       listings.price as price,
       listings.status as status,
       listings.mls_number as mls_number,
       ST_AsGeoJSON(addresses.location) as location
FROM listings
JOIN properties ON listings.property_id = properties.id
JOIN addresses  ON properties.address_id = addresses.id
WHERE listings.id = ANY($1::uuid[])