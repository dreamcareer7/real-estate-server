INSERT INTO showings_credentials
    (
      "user",
      brand,
      username,
      password
    )
VALUES
    (
      $1,
      $2,
      $3,
      $4
    )
RETURNING id
