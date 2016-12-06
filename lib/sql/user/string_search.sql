SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM users
WHERE users.deleted_at IS NULL AND
      concat_ws(
        ' ',
        users.first_name,
        users.last_name,
        users.email,
        users.phone_number
      ) ILIKE ALL($1)
ORDER BY users.first_name,
         users.last_name,
         users.email,
         users.phone_number
LIMIT $2
