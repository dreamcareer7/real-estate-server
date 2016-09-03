WITH p AS (
  SELECT rooms.room_type,
         rooms_users.room,
         ARRAY_AGG(rooms_users."user") FILTER (WHERE rooms_users."user" <> $1) AS members,
         rooms.updated_at AS updated_at
  FROM rooms_users
  INNER JOIN rooms ON
    rooms_users.room = rooms.id
  WHERE rooms_users.room IN
  (
    SELECT room
    FROM rooms_users
    WHERE "user" = $1
  )
  GROUP BY rooms_users.room,
           rooms.room_type,
           rooms.updated_at
),
i AS (
  SELECT room,
         ARRAY_AGG(phone_number) FILTER (WHERE phone_number IS NOT NULL) AS invitees
  FROM invitation_records
  WHERE room IN
  (
    SELECT room
    FROM rooms_users
    WHERE "user" = $1
  )
  GROUP BY room
)
SELECT p.room AS id
FROM p
LEFT JOIN i ON
  p.room = i.room
WHERE $2::uuid[] <@ p.members::uuid[] AND
      p.members::uuid[] <@ $2::uuid[] AND
      CASE WHEN ($3::text[] IS NULL OR ARRAY_LENGTH($3::text[], 1) = 0) THEN TRUE ELSE
      (
        $3::text[] <@ i.invitees::text[] AND
        i.invitees::text[] <@ $3::text[]
      ) END
      -- CASE WHEN $3::text[] IS NULL THEN TRUE ELSE TRUE END
ORDER by updated_at
