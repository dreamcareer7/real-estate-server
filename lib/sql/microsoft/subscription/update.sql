UPDATE microsoft_subscriptions
SET
  subscription_id = $1,
  resource = $2,
  change_type = $3,
  client_state = $4,
  notification_url = $5,
  expiration_date_time = $7,
  creator_id = $7,
  application_id = $8,
  updated_at = now()
WHERE
  id = $1