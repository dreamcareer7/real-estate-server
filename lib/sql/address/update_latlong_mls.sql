UPDATE addresses
SET geocoded = TRUE,
    corrupted = FALSE,
    updated_at = CLOCK_TIMESTAMP(),
    location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    geo_source = 'MLS',
    approximate = TRUE
WHERE id = $3
