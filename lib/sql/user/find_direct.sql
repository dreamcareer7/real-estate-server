WITH p AS (
  SELECT rooms.room_type,
         rooms_users.room,
         ARRAY_AGG(rooms_users."user") AS members
  FROM rooms_users
  INNER JOIN rooms ON
    rooms_users.room = rooms.id
  WHERE rooms_users.room IN
  (
    SELECT room
    FROM rooms_users
    WHERE "user" = $1
  ) AND rooms.room_type = 'Direct'
  GROUP BY rooms_users.room,
           rooms.room_type
)
SELECT room AS id
FROM p
WHERE p.members::uuid[] @> '{$1, $2}'::uuid[] AND
      p.members <@ '{$1, $2}'::uuid[]
LIMIT 1
