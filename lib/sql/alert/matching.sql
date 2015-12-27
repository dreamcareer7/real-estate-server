with address_ids AS
(
  SELECT id FROM addresses WHERE
    location IS NOT NULL AND
    ST_Within(addresses.location, ST_SetSRID(ST_GeomFromText($14), 4326))
)

SELECT
  listings.id AS id,
  (COUNT(*) OVER())::INT AS total
FROM listings WHERE
  listings.status = 'Active' AND
  listings.price >= $1 AND
  listings.price <= $2 AND
  listings.property_id IN(
    SELECT id FROM properties WHERE
      square_meters >= $3 AND
      square_meters <= $4 AND
      bedroom_count >= $5 AND
      ((half_bathroom_count + full_bathroom_count) >= $6) AND
      property_type = $7 AND
      property_subtype = ANY ($8::property_subtype[]) AND
      COALESCE(year_built >= $9, TRUE) = TRUE AND
      COALESCE(year_built <= $10, TRUE) = TRUE AND
      COALESCE(pool_yn = $11, TRUE) = TRUE AND
      COALESCE(lot_square_meters >= $12, TRUE) = TRUE AND
      COALESCE(lot_square_meters <= $13, TRUE) = TRUE AND
      address_id IN(
        select * from address_ids
      )
  )
  AND (
    ($15::boolean IS NULL) OR (
      SELECT count(*) > 0 FROM open_houses WHERE
      listing_mui = listings.matrix_unique_id AND start_time > NOW()
    )
  )