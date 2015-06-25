UPDATE addresses
SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    updated_at = NOW(),
    geo_source = $3,
    geocoded = TRUE,
    partial_match = $4,
    geo_source_formatted_address = $5,
    geo_confidence = $6,
    approximate = $7
WHERE id = $8
