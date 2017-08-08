SELECT (rooms_users.notification_setting <> 'N_NONE') AS ok
FROM rooms_users
WHERE rooms_users."user" = $1 AND
      rooms_users.room = $2
