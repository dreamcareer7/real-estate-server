SELECT id,
       room
FROM alerts
WHERE
  deleted_at IS NULL AND
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

  (listing_statuses IS NULL OR listing_statuses @> ARRAY[$12::listing_status]) AND

  (pool IS NULL OR pool = $10) AND

  (pets IS NULL OR pets = $31) AND
  (number_of_pets_allowed IS NULL OR number_of_pets_allowed <=  $32) AND
  (application_fee IS NULL OR application_fee = $33) AND
  (appliances IS NULL OR appliances = $34) AND
  (furnished IS NULL OR furnished = $35) AND
  (fenced_yard IS NULL OR fenced_yard = $36) AND

  (property_types    IS NULL OR property_types @> ARRAY[$5::property_type])       AND
  (property_subtypes IS NULL OR property_subtypes @> ARRAY[$6::property_subtype]) AND

  (points IS NULL OR ST_Within(ST_SetSRID(ST_MakePoint($7, $8), 4326), points)) AND

  (minimum_parking_spaces IS NULL OR minimum_parking_spaces <= $13) AND

  (list_offices IS NULL OR list_offices @> ARRAY[$14]) AND
  (list_agents  IS NULL OR list_agents @> ARRAY[$15])  AND

  (selling_offices IS NULL OR selling_offices @> ARRAY[$16]) AND
  (selling_agents  IS NULL OR selling_agents  @> ARRAY[$17])  AND

  (architectural_styles IS NULL OR architectural_styles @> $18) AND

  (counties IS NULL OR counties @> ARRAY[$19]) AND

  (postal_codes IS NULL OR postal_codes @> ARRAY[$30]) AND

  (subdivisions IS NULL OR subdivisions @> ARRAY[$20]) AND

  (school_districts     IS NULL OR school_districts @> ARRAY[$21])    AND

  (primary_schools      IS NULL OR primary_schools @> ARRAY[$22])     AND

  (middle_schools       IS NULL OR primary_schools @> ARRAY[$23])     AND

  (elementary_schools   IS NULL OR elementary_schools @> ARRAY[$24])  AND

  (senior_high_schools  IS NULL OR senior_high_schools @> ARRAY[$25]) AND

  (junior_high_schools  IS NULL OR junior_high_schools @> ARRAY[$26]) AND

  (intermediate_schools IS NULL OR junior_high_schools @> ARRAY[$27]) AND

  (mls_areas IS NULL OR
    (
      to_jsonb(ARRAY[
        substring($28 FROM E'[0-9]+')::int,
        substring($29 FROM E'[0-9]+')::int
      ]) IN (SELECT jsonb_array_elements(mls_areas))
    ) OR
    (
      to_jsonb(ARRAY[
        substring($28 FROM E'[0-9]+')::int,
        0
      ]) IN (SELECT jsonb_array_elements(mls_areas))
    )
  )
