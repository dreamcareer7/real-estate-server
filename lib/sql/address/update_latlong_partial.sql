UPDATE addresses
SET location_partial = ST_SetSRID(ST_MakePoint($1, $2), 4326),
    updated_at = NOW()
WHERE id = $3
