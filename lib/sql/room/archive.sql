UPDATE rooms_users
SET archived = TRUE,
    push_enabled = FALSE
WHERE room = $1 AND
      "user" = $2
