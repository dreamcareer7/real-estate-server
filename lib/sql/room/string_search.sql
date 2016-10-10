WITH r AS (
  SELECT rooms_users.room AS id,
         STRING_AGG(
           concat_ws(
             users.first_name,
             users.last_name,
             users.email,
             users.phone_number,
             rooms.title
           ), ''
         ) AS all
  FROM rooms_users
  INNER JOIN users
    ON rooms_users."user" = users.id
  INNER JOIN rooms
    ON rooms_users.room = rooms.id
  WHERE rooms.deleted_at IS NULL AND
        CASE WHEN $4::room_type[] IS NULL THEN TRUE ELSE ARRAY[rooms.room_type]::room_type[] <@ $4::room_type[] END AND
        rooms_users."user" <> $1 AND
        rooms_users.room IN
        (
          SELECT room FROM rooms_users WHERE "user" = $1
        )
  GROUP BY rooms_users.room
)
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM r
WHERE r.all ILIKE ALL($2)
LIMIT $3
