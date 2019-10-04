SELECT listings.id FROM addresses
INNER JOIN properties
    ON properties.address_id = addresses.id
INNER JOIN listings
    ON listings.property_id = properties.id
WHERE addresses.id = $1
