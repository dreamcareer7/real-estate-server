INSERT INTO showings_credentials
    (
      username,
      password,
      agent
    )
VALUES
    (
      $1,
      $2,
      $3,
    )
RETURNING id
