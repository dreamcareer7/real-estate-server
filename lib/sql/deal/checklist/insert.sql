INSERT INTO deals_checklists (
  title,
  "order",
  deal,
  origin,
  deactivated_at,
  terminated_at

) VALUES (
  $1,
  $2,
  $3,
  $4,
  (
    CASE
      WHEN $5::boolean = false THEN NULL
      WHEN $5 IS NULL  THEN NULL
      ELSE CLOCK_TIMESTAMP()
    END
  ),

  (
    CASE
      WHEN $6::boolean = false THEN NULL
      WHEN $6 IS NULL  THEN NULL
      ELSE CLOCK_TIMESTAMP()
    END
  )
)
RETURNING id