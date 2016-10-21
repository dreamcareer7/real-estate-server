UPDATE users
SET phone_number = NULL
WHERE id::text = $1::text OR
      phone_number = $1 OR
      email = $1
