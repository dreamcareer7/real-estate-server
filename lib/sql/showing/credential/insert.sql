INSERT INTO showings_credentials
  (
    "user",
    brand,
    username,
    password,
    login_status
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5
  )
RETURNING id
