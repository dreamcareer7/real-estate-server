INSERT INTO deals
  (created_by, listing, faired_at, deal_type, property_type, brand)
  VALUES (
    $1,
    $2,
    (
      CASE WHEN $3 IS FALSE THEN CLOCK_TIMESTAMP()
      ELSE NULL
      END
    ),
    $4,
    $5,
    $6
  )
RETURNING *