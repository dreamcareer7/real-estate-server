SELECT DISTINCT (listings.id)
FROM listings
INNER JOIN properties
ON listings.property_id = properties.id
WHERE
    listings.price >= $1 AND
    listings.price <= $2 AND
    properties.square_meters >= $3 AND
    properties.square_meters <= $4 AND
    properties.bedroom_count >= $5 AND
    properties.bathroom_count >= $6 AND
    properties.property_type = $7 AND
    properties.property_subtype @> $8::property_subtype[]
