SELECT listings.id
FROM listings
INNER JOIN addresses ON
    listings.matrix_unique_id = addresses.matrix_unique_id
WHERE
    (
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.title ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.subtitle ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.street_number ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.street_name ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.city ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.state ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.state_code ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.street_suffix ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.country::text ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.country_code::text ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.street_dir_prefix ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE addresses.street_dir_suffix ~* ANY($1) END) OR
     (CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NULL THEN TRUE ELSE listings.mls_number ~* ANY($1) END)
    )
LIMIT 10
