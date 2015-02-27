SELECT 'agency' AS TYPE,
       agencies.*,

  (SELECT ROW_TO_JSON(_)
   FROM
     (SELECT addresses.*,
             EXTRACT(EPOCH FROM addresses.created_at) AS created_at,
             EXTRACT(EPOCH FROM addresses.updated_at) AS updated_at,
             'address' AS TYPE) AS _) AS address
FROM agencies
LEFT JOIN addresses ON agencies.address_id = addresses.id
WHERE agencies.id = $1
