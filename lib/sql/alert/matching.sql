WITH listing_muis AS
(
  SELECT matrix_unique_id FROM listings WHERE
  status = ANY($16::listing_status[]) AND
  listings.price >= $1 AND
  listings.price <= $2
),
address_ids AS
(
  SELECT addresses.id FROM addresses
  JOIN listing_muis ON addresses.matrix_unique_id = listing_muis.matrix_unique_id
  WHERE
    addresses.location IS NOT NULL AND
    ST_Within(addresses.location, ST_SetSRID(ST_GeomFromText($14), 4326))
), property_ids AS
(
  SELECT properties.id FROM properties
  JOIN address_ids ON properties.address_id = address_ids.id
  WHERE
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
    COALESCE(lot_square_meters <= $13, TRUE) = TRUE
)

SELECT
  listings.id AS id,
  (COUNT(*) OVER())::INT AS total
FROM listings
  JOIN property_ids ON listings.property_id = property_ids.id
WHERE
  (
    ($15::boolean IS NULL OR $15::boolean = false) OR (
      SELECT count(*) > 0 FROM open_houses WHERE
      listing_mui = listings.matrix_unique_id AND start_time > NOW()
    )
  )
  AND (
    CASE WHEN ((($17::float) IS NULL) OR (listings.status <> 'Sold')) THEN TRUE ELSE (
      CASE WHEN listings.close_date IS NULL THEN FALSE ELSE (
        close_date > to_timestamp($17::float)
      ) END
    ) END
  )
