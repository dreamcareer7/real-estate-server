SELECT id,
       'office' as type,
       mls_id,
       name,
       long_name,
       address,
       phone,
       fax,
       city,
       state,
       postal_code,
       license_number,
       email,
       ARRAY_TO_STRING (
        ARRAY[
          NULLIF(city, ''),
          NULLIF(state, ''),
          NULLIF(postal_code, '')
        ], ' ', NULL
      ) AS address_line2
FROM offices
JOIN unnest($1::uuid[]) WITH ORDINALITY t(oid, ord) ON offices.id = oid
ORDER BY t.ord
