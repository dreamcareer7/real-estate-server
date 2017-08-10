INSERT INTO deals
  (created_by, listing, context, deal_type, contract_type, brand)
  VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
  )
RETURNING *