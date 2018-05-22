SELECT alert as id, status, 'alert_setting' as type FROM user_alert_settings
  WHERE 
  "user" = $1 AND
  alert = ANY($2)