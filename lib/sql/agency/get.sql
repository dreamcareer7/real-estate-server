SELECT 'agency' AS TYPE,
       agencies.*,

  (SELECT ROW_TO_JSON(_)
   FROM
     (SELECT addresses.*,
             'address' AS TYPE) AS _) AS address
FROM agencies
LEFT JOIN addresses ON agencies.address_id = addresses.id
WHERE agencies.id = $1
