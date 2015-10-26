WITH r AS (
    SELECT rooms_users.room AS id,
    rooms.title AS title,
    JSON_AGG(users.first_name) AS first_names,
    JSON_AGG(users.last_name) AS last_names,
    JSON_AGG(users.email) AS emails,
    JSON_AGG(users.phone_number) AS phone_numbers,
    ARRAY_AGG(rooms_users."user") AS users
    FROM rooms_users
    INNER JOIN users
    ON rooms_users."user" = users.id
    INNER JOIN rooms
    ON rooms_users."room" = rooms.id
    GROUP BY rooms_users.room,
             rooms.title
   )
SELECT id,
       title,
       first_names,
       last_names,
       emails,
       phone_numbers
FROM r
WHERE $1 = ANY (r.users)
