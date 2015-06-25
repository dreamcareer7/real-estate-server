UPDATE addresses
SET location_bing = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    geocoded = TRUE,
    geocoded_bing = TRUE,
    updated_at = NOW(),
    geo_source = $3,
    partial_match = $4,
    geo_source_formatted_address_bing = $5,
    geo_confidence_bing = $6,
    approximate = $7
WHERE id = $8
