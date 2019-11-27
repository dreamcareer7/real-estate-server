UPDATE microsoft_subscriptions
SET
  expiration_date_time = $2,
  updated_at = now()
WHERE
  id = $1