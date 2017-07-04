SELECT addresses.*,
       'address' AS TYPE,
       ST_AsGeoJSON(location) AS location,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM addresses
JOIN unnest($1::uuid[]) WITH ORDINALITY t(aid, ord) ON addresses.id = aid
ORDER BY t.ord
