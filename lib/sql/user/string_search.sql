WITH related_users AS (
    WITH user_rooms AS (
        SELECT rooms_users.room
        FROM rooms_users
        WHERE rooms_users."user" = $1
    )
    SELECT DISTINCT(rooms_users."user") AS id
    FROM rooms_users
    INNER JOIN user_rooms ON
        user_rooms.room = rooms_users.room
    INNER JOIN users ON
        rooms_users."user" = users.id
    WHERE rooms_users."user" <> $1
)
SELECT related_users.id,
(COUNT(*) OVER())::INT AS total
FROM related_users
INNER JOIN users
ON related_users.id = users.id
WHERE
    (
     (CASE WHEN ARRAY_LENGTH($2::text[], 1) IS NULL THEN TRUE ELSE users.first_name ~* ANY($2) END) OR
     (CASE WHEN ARRAY_LENGTH($2::text[], 1) IS NULL THEN TRUE ELSE users.last_name ~* ANY($2) END) OR
     (CASE WHEN ARRAY_LENGTH($2::text[], 1) IS NULL THEN TRUE ELSE users.email ~* ANY($2) END) OR
     (CASE WHEN ARRAY_LENGTH($2::text[], 1) IS NULL THEN TRUE ELSE users.phone_number ~* ANY($2) END)
    ) AND
    users.deleted_at IS NULL
ORDER BY users.first_name
