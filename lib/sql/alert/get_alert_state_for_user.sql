SELECT alert, status FROM user_alert_settings
  WHERE 
  "user" = $1 AND
  alert = ANY($2)