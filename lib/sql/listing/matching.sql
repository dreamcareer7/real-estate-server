SELECT id,
       room
FROM alerts
WHERE
  (minimum_price IS NULL OR minimum_price <= $1) AND
  (maximum_price IS NULL OR maximum_price >= $1) AND

  (minimum_square_meters IS NULL OR minimum_square_meters <= $2) AND
  (maximum_square_meters IS NULL OR maximum_square_meters >= $2) AND

  (minimum_lot_square_meters IS NULL OR minimum_lot_square_meters <= $11) AND
  (maximum_lot_square_meters IS NULL OR maximum_lot_square_meters >= $11) AND

  (minimum_bedrooms  IS NULL OR minimum_bedrooms  <=  $3) AND

  (minimum_bathrooms IS NULL OR minimum_bathrooms <= $4) AND

  (minimum_year_built IS NULL OR minimum_year_built <= $9) AND
  (maximum_year_built IS NULL OR maximum_year_built >= $9) AND

  (listing_statuses IS NULL OR $12 IN listing_statuses) AND

  (pool IS NULL OR pool = FALSE OR $10 = TRUE) AND

  (property_types    IS NULL OR $5::property_type    IN property_types)    AND
  (property_subtypes IS NULL OR $6::property_subtype IN property_subtypes) AND

  (points IS NULL OR ST_Within(ST_SetSRID(ST_MakePoint($7, $8), 4326), points)) AND

  (minimum_parking_spaces IS NULL OR minimum_parking_spaces <= $13) AND

  (list_offices IS NULL OR $14 IN list_offices) AND
  (list_agents  IS NULL OR $15 IN list_agents)  AND

  (selling_offices IS NULL OR $16 IN selling_offices) AND
  (selling_agents  IS NULL OR $17 IN selling_agents)  AND

  (architectural_styles IS NULL OR $18 IN architectural_styles) AND

  (counties IS NULL OR $19 IN counties) AND

  (subdivisions IS NULL OR $20 IN counties) AND

  (school_districts     IS NULL OR $21 IN school_districts)    AND

  (primary_schools      IS NULL OR $22 IN primary_schools)     AND

  (elementary_schools   IS NULL OR $23 IN elementary_schools)  AND

  (senior_high_schools  IS NULL OR $23 IN senior_high_schools) AND

  (junior_high_schools  IS NULL OR $23 IN junior_high_schools) AND

  (intermediate_schools IS NULL OR $23 IN junior_high_schools) AND

  (mls_areas IS NULL OR
    ARRAY[
      (regexp_matches($24, '(.+)\s\((\d+)\)$'))[2]::int,
      COALESCE((regexp_matches($25, '(.+)\s\((\d+)\)$'))[2]::int, 0)
    ]
  )