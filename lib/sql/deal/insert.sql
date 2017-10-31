INSERT INTO deals
  (created_by, listing, deal_type, property_type, brand)
  VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
  )
RETURNING *