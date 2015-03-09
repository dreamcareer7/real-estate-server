UPDATE alerts
SET currency = $1,
    minimum_price = $2,
    maximum_price = $3,
    min_bedrooms = $4,
    min_bathrooms = $5,
    minimum_square_meters = $6,
    maximum_square_meters = $7,
    created_by = $8,
    shortlist = $9,
    location = ST_SetSRID(ST_MakePoint($10, $11), 4326),
    title = $12
WHERE id = $13
