SELECT alerts.id
FROM alerts
INNER JOIN rooms_users
    ON alerts.room = rooms_users.room
WHERE rooms_users."user" = $1 AND
    alerts.deleted_at IS NULL
ORDER BY alerts.created_at DESC
