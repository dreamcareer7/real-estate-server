UPDATE addresses
SET location_mapbox = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    geocoded_mapbox = TRUE,
    corrupted_mapbox = FALSE,
    geo_source_formatted_address_mapbox = $3,
    geo_confidence_mapbox = $4,
    updated_at = CLOCK_TIMESTAMP()
WHERE id = $5
RETURNING
  addresses.id,
  addresses.location_mapbox AS location
