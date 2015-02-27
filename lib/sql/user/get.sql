SELECT users.*,
       EXTRACT(EPOCH FROM user.created_at) AS created_at,
       EXTRACT(EPOCH FROM user.updated_at) AS updated_at,
  (SELECT ROW_TO_JSON(_)
   FROM
     (SELECT addresses.*,
             'address' AS TYPE) AS _) AS address
FROM users
LEFT JOIN addresses ON users.address_id = addresses.id
WHERE users.id = $1
