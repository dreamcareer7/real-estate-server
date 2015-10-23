SELECT 'compact_listing' AS TYPE,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
       listings.price AS price,
       listings.status AS status,
       listings.mls_number AS mls_number,
       ST_AsGeoJSON(addresses.location) AS location
FROM listings
INNER JOIN properties ON listings.property_id = properties.id
INNER JOIN addresses ON properties.address_id = addresses.id
WHERE listings.id = ANY($1::uuid[])
