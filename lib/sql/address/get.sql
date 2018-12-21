SELECT addresses.*,
        'address' AS TYPE,
        ST_AsGeoJSON(location) AS location,
        EXTRACT(EPOCH FROM created_at) AS created_at,
        EXTRACT(EPOCH FROM updated_at) AS updated_at,
        (
          SELECT ARRAY_TO_STRING
          (
            ARRAY[
              street_number,
              street_dir_prefix,
              street_name,
              street_suffix,
              CASE
                WHEN addresses.unit_number IS NULL THEN NULL
                WHEN addresses.unit_number = '' THEN NULL
                ELSE 'Unit ' || addresses.unit_number || ',' END,
              addresses.city || ',',
              addresses.state_code,
              addresses.postal_code
            ], ' ', NULL
          )
        ) AS full_address,
        (
          SELECT ARRAY_TO_STRING
          (
            ARRAY[
              street_number,
              street_dir_prefix,
              street_name,
              street_suffix,
              CASE
                WHEN addresses.unit_number IS NULL THEN NULL
                WHEN addresses.unit_number = '' THEN NULL
                ELSE 'Unit ' || addresses.unit_number END
            ], ' ', NULL
          )
        ) AS street_address
FROM addresses
JOIN unnest($1::uuid[]) WITH ORDINALITY t(aid, ord) ON addresses.id = aid
ORDER BY t.ord
