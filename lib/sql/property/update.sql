UPDATE properties
SET property_type = $1,
    bedroom_count = $2,
    bathroom_count = $3,
    description = $4,
    square_meters = $5
    address_id = $6,
WHERE id = $7
