SELECT "user" as id from user_alert_settings
  WHERE 
  "user" = ANY($1) AND 
  alert = ANY($2) AND 
  status = $3