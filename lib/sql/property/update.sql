UPDATE properties
SET property_type = $1,
    property_subtype = $2,
    bedroom_count = $3,
    bathroom_count = $4,
    description = $5,
    square_meters = $6,
    lot_square_meters = $7,
    year_built = $8
WHERE id = $9
