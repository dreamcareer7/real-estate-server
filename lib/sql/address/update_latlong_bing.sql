UPDATE addresses
SET location_bing = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    geocoded_bing = TRUE,
    geo_source_formatted_address_bing = $3,
    geo_confidence_bing = $4,
    updated_at = NOW()
WHERE id = $5
