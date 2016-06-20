WITH r AS (
    SELECT rooms_users.room AS id,
    rooms.title AS title,
    rooms.room_type AS room_type,
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
             rooms.title,
             rooms.room_type
   )
SELECT id,
       title,
       first_names,
       last_names,
       emails,
       phone_numbers,
       room_type
FROM r
WHERE $1 = ANY (r.users) AND
      CASE WHEN ARRAY_LENGTH($2::room_type[], 1) IS NULL THEN TRUE ELSE r.room_type = ANY($2::room_type[]) END
