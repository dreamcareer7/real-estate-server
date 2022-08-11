INSERT INTO users
    (
      first_name,
      last_name,
      password,
      email,
      phone_number,
      user_type,
      is_shadow,
      brand,
      fake_email
    )
VALUES
    (
      $1,
      $2,
      $3,
      LOWER(TRIM($4)),
      $5,
      $6,
      $7,
      $8,
      $9
    )
RETURNING id
