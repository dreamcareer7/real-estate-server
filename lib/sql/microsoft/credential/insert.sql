INSERT INTO microsoft_credentials
  (
    "user",
    brand,

    email,
    remote_id,
    display_name,
    first_name,
    last_name,
    photo,

    access_token,
    refresh_token,
    id_token,
    expires_in,
    ext_expires_in,
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
    $15
  )
ON CONFLICT ("user", brand, email) DO UPDATE SET
  display_name = $5,
  first_name = $6,
  last_name = $7,
  photo = $8,

  access_token = $9,
  refresh_token = $10,
  id_token  = $11,
  expires_in = $12,
  ext_expires_in = $13,
  scope = $14,
  scope_summary = $15,

  revoked = false,
  sync_status = NULL,
  last_sync_at = NULL,
  messages_last_sync_at = null,

  updated_at = now(),
  deleted_at = null
RETURNING id