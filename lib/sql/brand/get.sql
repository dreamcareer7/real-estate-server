SELECT *,
       'brand' AS TYPE,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,

      -- If offices.brand is set, then this brand will have the office_mls_id of that office
       (SELECT mls_id FROM offices WHERE brand = $1 LIMIT 1) as office_mls_id
FROM brands
WHERE id = $1
LIMIT 1
