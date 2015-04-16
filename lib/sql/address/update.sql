UPDATE addresses
SET title = $1,
    subtitle = $2,
    street_suffix = $3,
    street_number = $4,
    street_name = $5,
    city = $6,
    state = $7,
    state_code = $8,
    country = $9,
    country_code = $10,
    unit_number = $11,
    postal_code = $12,
    neighborhood = $13
WHERE id = $14
