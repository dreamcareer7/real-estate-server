INSERT INTO deals
  (created_by, listing, context, flags, brand)
  VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
  )
RETURNING *