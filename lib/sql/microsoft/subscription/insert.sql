INSERT INTO microsoft_subscriptions
  (
    microsoft_credential,
    subscription_id,
    resource,
    change_type,
    client_state,
    notification_url,
    expiration_date_time,
    creator_id,
    application_id
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9
  )
ON CONFLICT (microsoft_credential, resource) DO UPDATE SET
  subscription_id = $2,
  resource = $3,
  change_type = $4,
  client_state = $5,
  notification_url = $6,
  expiration_date_time = $7,
  creator_id = $8,
  application_id = $9,
  updated_at = NOW(),
  deleted_at = NULL
RETURNING id