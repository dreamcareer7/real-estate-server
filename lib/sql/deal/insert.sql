INSERT INTO deals
  (created_by, listing, is_draft, deal_type, property_type, brand)
  VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
  )
RETURNING *