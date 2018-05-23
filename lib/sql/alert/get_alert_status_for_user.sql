SELECT alert as id, status, 'alert_setting' as type FROM user_alert_settings
  WHERE 
  alert = ANY($1)