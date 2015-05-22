SELECT DISTINCT (listings.id)
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
    ST_Distance(ST_SetSRID(ST_MakePoint($9, $10), 4326), addresses.location, TRUE) < $11
