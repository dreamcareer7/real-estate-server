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
       license_number
FROM offices
JOIN unnest($1::uuid[]) WITH ORDINALITY t(oid, ord) ON offices.id = oid
ORDER BY t.ord
