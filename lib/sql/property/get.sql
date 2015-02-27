SELECT 'property' AS TYPE,
       properties.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
  (SELECT ROW_TO_JSON(_)
   FROM
     (SELECT addresses.*,
             'address' AS TYPE) AS _) AS address,

  (SELECT ROW_TO_JSON(_)
   FROM
     (SELECT JSON_BUILD_ARRAY() AS property_details,
             JSON_BUILD_ARRAY() AS cost_breakdown,
             JSON_BUILD_ARRAY() AS features ) AS _) AS items
FROM properties
LEFT JOIN addresses ON properties.address_id = addresses.id
WHERE properties.id = $1
