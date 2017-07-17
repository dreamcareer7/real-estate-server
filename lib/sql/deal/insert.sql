INSERT INTO deals
  (created_by, listing, context, flags, brand)
  VALUES (
    $1,
    $2,
    $3,
    $4,
    (
      SELECT brand FROM users WHERE users.id = $1
    )
  )
RETURNING *