INSERT INTO gmails
  (
    "user",
    brand,
    email,

    messages_total,
    threads_total,

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
    $9
  )
RETURNING id