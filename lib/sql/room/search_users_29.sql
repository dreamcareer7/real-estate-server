WITH p AS (
  SELECT rooms.room_type,
         rooms_users.room,
         ARRAY_AGG(rooms_users."user") AS members,
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
  AND rooms.room_type <> 'Personal'
  AND rooms.deleted_at IS NULL
  GROUP BY rooms_users.room,
           rooms.room_type,
           rooms.updated_at
),
i AS (
  SELECT room,
         ARRAY_AGG(invitation_records.phone_number) FILTER (WHERE invitation_records.phone_number IS NOT NULL) AS invitees
  FROM invitation_records
  INNER JOIN rooms ON
    invitation_records.room = rooms.id
  WHERE invitation_records.room IN
  (
    SELECT room
    FROM rooms_users
    WHERE "user" = $1
  ) AND rooms.room_type <> 'Personal'
  GROUP BY invitation_records.room
)
SELECT p.room AS id
FROM p
LEFT JOIN i ON
  p.room = i.room
WHERE $2::uuid[] <@ p.members::uuid[] AND
      p.members::uuid[] <@ $2::uuid[] AND
      CASE WHEN ($3::text[] IS NULL OR COALESCE(ARRAY_LENGTH($3::text[], 1), 0) = 0) THEN TRUE ELSE
      (
        $3::text[] <@ i.invitees::text[] AND
        i.invitees::text[] <@ $3::text[]
      ) END
ORDER by updated_at
