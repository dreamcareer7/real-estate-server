UPDATE addresses
SET geocoded = TRUE,
    corrupted = FALSE,
    updated_at = CLOCK_TIMESTAMP(),
    location = $1,
    geo_source = $2,
    approximate = $3
WHERE id = $4
