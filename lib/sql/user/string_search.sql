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
    (users.first_name ~* $2 OR
     users.last_name ~* $2) AND
     users.deleted_at IS NULL
ORDER BY users.first_name
