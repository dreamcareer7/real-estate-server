SELECT id
FROM alerts
WHERE room IN (
        SELECT room
        FROM rooms_users
        WHERE "user" = $1
    ) AND
    deleted_at IS NULL AND
    title ~* ANY ($2)
ORDER BY title
