INSERT INTO user_alert_settings(
  "user",
  alert,
  status
) VALUES(
  $1,
  $2,
  $3
)
ON CONFLICT ("user", alert)
DO
  UPDATE 
    SET status = $3, updated_at = CLOCK_TIMESTAMP()