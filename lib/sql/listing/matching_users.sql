SELECT DISTINCT(rooms_users."user") AS id
FROM alerts
INNER JOIN rooms_users
  ON alerts.room = rooms_users.room
WHERE
  alerts.deleted_at IS NULL AND
  (alerts.minimum_price IS NULL OR alerts.minimum_price <= $1) AND
  (alerts.maximum_price IS NULL OR alerts.maximum_price >= $1) AND

  (alerts.minimum_square_meters IS NULL OR alerts.minimum_square_meters <= $2) AND
  (alerts.maximum_square_meters IS NULL OR alerts.maximum_square_meters >= $2) AND

  (alerts.minimum_lot_square_meters IS NULL OR alerts.minimum_lot_square_meters <= $11) AND
  (alerts.maximum_lot_square_meters IS NULL OR alerts.maximum_lot_square_meters >= $11) AND

  (alerts.minimum_bedrooms  IS NULL OR alerts.minimum_bedrooms  <=  $3) AND

  (alerts.minimum_bathrooms IS NULL OR alerts.minimum_bathrooms <= $4) AND

  (alerts.minimum_year_built IS NULL OR alerts.minimum_year_built <= $9) AND
  (alerts.maximum_year_built IS NULL OR alerts.maximum_year_built >= $9) AND

  (alerts.listing_statuses IS NULL OR alerts.listing_statuses @> ARRAY[$12::listing_status]) AND

  (alerts.pool IS NULL OR alerts.pool = FALSE OR $10 = TRUE) AND

  (alerts.property_types    IS NULL OR alerts.property_types @> ARRAY[$5::property_type])       AND
  (alerts.property_subtypes IS NULL OR alerts.property_subtypes @> ARRAY[$6::property_subtype]) AND

  (alerts.points IS NULL OR ST_Within(ST_SetSRID(ST_MakePoint($7, $8), 4326), alerts.points)) AND

  (alerts.minimum_parking_spaces IS NULL OR alerts.minimum_parking_spaces <= $13) AND

  (alerts.list_offices IS NULL OR alerts.list_offices @> ARRAY[$14]) AND
  (alerts.list_agents  IS NULL OR alerts.list_agents @> ARRAY[$15])  AND

  (alerts.selling_offices IS NULL OR alerts.selling_offices @> ARRAY[$16]) AND
  (alerts.selling_agents  IS NULL OR alerts.selling_agents  @> ARRAY[$17])  AND

  (alerts.architectural_styles IS NULL OR alerts.architectural_styles @> $18) AND

  (alerts.counties IS NULL OR alerts.counties @> ARRAY[$19]) AND

  (alerts.postal_codes IS NULL OR alerts.postal_codes @> ARRAY[$30]) AND

  (alerts.subdivisions IS NULL OR alerts.subdivisions @> ARRAY[$20]) AND

  (alerts.school_districts     IS NULL OR alerts.school_districts @> ARRAY[$21])    AND

  (alerts.primary_schools      IS NULL OR alerts.primary_schools @> ARRAY[$22])     AND

  (alerts.middle_schools       IS NULL OR alerts.primary_schools @> ARRAY[$23])     AND

  (alerts.elementary_schools   IS NULL OR alerts.elementary_schools @> ARRAY[$24])  AND

  (alerts.senior_high_schools  IS NULL OR alerts.senior_high_schools @> ARRAY[$25]) AND

  (alerts.junior_high_schools  IS NULL OR alerts.junior_high_schools @> ARRAY[$26]) AND

  (alerts.intermediate_schools IS NULL OR alerts.junior_high_schools @> ARRAY[$27]) AND

  (alerts.mls_areas IS NULL OR
    (
      to_jsonb(ARRAY[
        substring($28 FROM E'[0-9]+')::int,
        substring($29 FROM E'[0-9]+')::int
      ]) IN (SELECT jsonb_array_elements(alerts.mls_areas))
    ) OR
    (
      to_jsonb(ARRAY[
        substring($28 FROM E'[0-9]+')::int,
        0
      ]) IN (SELECT jsonb_array_elements(alerts.mls_areas))
    )
  )
