UPDATE addresses
SET location_google = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    geocoded_google = TRUE,
    partial_match_google = $3,
    geo_source_formatted_address_google = $4,
    geo_confidence_google = $5,
    updated_at = NOW()
WHERE id = $6
