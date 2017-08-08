UPDATE rooms_users
SET archived = TRUE,
    notification_setting = 'N_NONE'
WHERE room = $1 AND
      "user" = $2
