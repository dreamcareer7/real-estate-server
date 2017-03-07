INSERT INTO deals
  (created_by, listing, context, brand)
  VALUES (
    $1,
    $2,
    $3,
    (
      SELECT brand FROM users WHERE users.id = $1
    )
  )
RETURNING id