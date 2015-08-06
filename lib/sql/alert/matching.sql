SELECT DISTINCT(listings.id)
FROM listings
INNER JOIN properties
ON listings.property_id = properties.id
INNER JOIN addresses
ON properties.address_id = addresses.id
WHERE
    listings.status = 'Active' AND
    listings.price >= $1 AND
    listings.price <= $2 AND
    properties.square_meters >= $3 AND
    properties.square_meters <= $4 AND
    properties.bedroom_count >= $5 AND
    ((properties.half_bathroom_count + properties.full_bathroom_count) >= $6) AND
    properties.property_type = $7 AND
    properties.property_subtype = ANY ($8::property_subtype[]) AND
    addresses.location IS NOT NULL AND
    COALESCE(ST_Within(addresses.location, ST_SetSRID(ST_GeomFromText($9), 4326)), FALSE) = TRUE AND
    COALESCE(properties.year_built >= $10, TRUE) = TRUE AND
    COALESCE(properties.pool_yn = $11, TRUE) = TRUE AND
    COALESCE(properties.lot_square_meters >= $12, TRUE) = TRUE AND
    COALESCE(properties.lot_square_meters <= $13, TRUE) = TRUE
