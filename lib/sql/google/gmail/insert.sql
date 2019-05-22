INSERT INTO gmails
  (
    "user",
    brand,
    email,

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
    $10
  )
ON CONFLICT ("user", brand) DO UPDATE SET
  messages_total = $4,
  threads_total = $5,
  history_id = $6,
  access_token = $7,
  refresh_token = $8,
  expiry_date = $9,
  scope = $10
RETURNING id