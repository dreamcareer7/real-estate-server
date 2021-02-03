INSERT INTO google_credentials
  (
    "user",
    brand,

    email,
    resource_name,
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
    scope,
    scope_summary
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
    $15,
    $16
  )
ON CONFLICT ("user", brand, email) DO UPDATE SET
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
  scope_summary = $16,

  revoked = false,
  messages_sync_history_id = null,
  watcher_exp = NULL,

  cgroups_sync_token = NULL,
  contacts_sync_token = NULL,
  other_contacts_sync_token = NULL,

  updated_at = now(),
  deleted_at = null
RETURNING id