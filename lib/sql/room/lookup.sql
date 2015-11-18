WITH r AS (
    SELECT rooms_users.room AS id,
    ARRAY_AGG(rooms_users."user") AS users
    FROM rooms_users
    GROUP BY rooms_users.room
   )
SELECT id
FROM r
WHERE $1 = ANY (r.users) AND
      $2 <@ r.users
