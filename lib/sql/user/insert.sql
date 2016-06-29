INSERT INTO users
    (
      first_name,
      last_name,
      password,
      email,
      phone_number,
      user_type,
      agent,
      is_shadow,
      brand
    )
VALUES
    (
      $1,
      $2,
      $3,
      LOWER($4),
      $5,
      $6,
      $7,
      $8,
      $9
    )
RETURNING id
