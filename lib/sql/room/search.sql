WITH rooms AS (
    SELECT rooms.id,
    ARRAY_AGG(rooms_users."user") AS users
    FROM rooms
    INNER JOIN rooms_users
        ON rooms.id = rooms_users.room
    GROUP BY rooms.id
   )
SELECT id
FROM rooms
WHERE $1 = ANY (rooms.users) AND
      $2 <@ rooms.users
