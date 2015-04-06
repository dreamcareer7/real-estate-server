SELECT listings.id
FROM listings
INNER JOIN properties
ON listings.property_id = properties.id
WHERE
    listing.price >= $1 AND
    listing.price <= $2 AND
    properties.square_meters >= $3 AND
    properties.square_meters <= $4 AND
    properties.bedroom_count >= $5 AND
    properties.bedroom_count <= $6
