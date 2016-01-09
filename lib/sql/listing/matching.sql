SELECT id,
       room
FROM alerts
WHERE $1 >= minimum_price AND
      $1 <= maximum_price AND
      $2 >= minimum_square_meters AND
      $2 <= maximum_square_meters AND
      $3 >= minimum_bedrooms AND
      $4 >= minimum_bathrooms AND
      $5 = property_type AND
      $12 = ANY(statuses) AND
      property_subtypes @> $6::property_subtype[] AND
      COALESCE(ST_Within(ST_SetSRID(ST_MakePoint($7, $8), 4326), points), FALSE) = TRUE AND
      COALESCE($9 >= minimum_year_built, TRUE) = TRUE AND
      COALESCE($9 <= maximum_year_built, TRUE) = TRUE AND
      COALESCE($10 = pool, TRUE) = TRUE AND
      COALESCE($11 <= maximum_lot_square_meters, TRUE) = TRUE AND
      COALESCE($11 >= minimum_lot_square_meters, TRUE) = TRUE AND
      deleted_at IS NULL
