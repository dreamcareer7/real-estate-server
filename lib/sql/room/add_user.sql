INSERT INTO rooms_users ("user", room, notification_setting) VALUES ($1, $2, $3)
ON CONFLICT(room, "user") DO NOTHING
