INSERT INTO showings_credentials
  (
    "user",
    brand,
    username,
    password,
    selected_location,
    selected_location_string,
    login_status
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
  )
RETURNING id
