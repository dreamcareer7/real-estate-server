UPDATE addresses
SET location_partial = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    updated_at = NOW(),
    geo_source = $4,
    geocoded = TRUE,
    partial_match = TRUE,
    geo_source_formatted_address = $5
WHERE id = $3
