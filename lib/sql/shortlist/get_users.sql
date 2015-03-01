SELECT 'user' AS TYPE,
       users.*,
       EXTRACT(EPOCH FROM users.created_at) AS created_at,
       EXTRACT(EPOCH FROM users.updated_at) AS updated_at,

       (SELECT ROW_TO_JSON(_)
        FROM
            (SELECT addresses.*,
                    'address' AS TYPE
            ) AS _
       ) AS address
FROM users
INNER JOIN shortlists_users ON users.id = shortlists_users.user
LEFT JOIN addresses ON users.address_id = addresses.id
WHERE shortlists_users.shortlist = $1
