SELECT "user" from user_alert_settings
WHERE alert = $1 AND
      status = $2