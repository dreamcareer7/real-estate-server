INSERT INTO google_credentials
  (
    "user",
    brand,

    resource_name,
    email,
    display_name,
    first_name,
    last_name,
    photo,

    messages_total,
    threads_total,
    history_id,

    access_token,
    refresh_token,
    expiry_date,
    scope
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
    $9,
    $10,
    $11,
    $12,    
    $13,
    $14,
    $15
  )
ON CONFLICT (email) DO UPDATE SET
  display_name = $5,
  first_name = $6,
  last_name = $7,
  photo = $8,

  messages_total = $9,
  threads_total = $10,
  history_id = $11,

  access_token = $12,
  refresh_token = $13,
  expiry_date = $14,
  scope = $15,

  revoked = false,
  last_sync_at = NULL,
  contacts_sync_token = NULL,
  contact_groups_sync_token = NULL,
  messages_sync_history_id = NULL,
  threads_sync_history_id = NULL
RETURNING id