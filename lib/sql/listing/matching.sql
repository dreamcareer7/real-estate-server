SELECT id,
       shortlist
FROM alerts
WHERE $1 >= minimum_price AND
      $1 <= maximum_price AND
      $2 >= minimum_square_meters AND
      $2 <= maximum_square_meters AND
      $3 >= min_bedrooms AND
      $4 >= min_bathrooms AND
      $5 = property_type AND
      property_subtypes @> $6::property_subtype[] AND
      COALESCE(ST_Within(ST_SetSRID(ST_MakePoint($7, $8), 4326), points), FALSE) = TRUE AND
      COALESCE($9 >= year_built, TRUE) = TRUE AND
      COALESCE($10 = pool, TRUE) = TRUE AND
      archived IS FALSE
