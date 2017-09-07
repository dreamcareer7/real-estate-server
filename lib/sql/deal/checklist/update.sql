UPDATE deals_checklists SET
  title = $2,
  "order" = $3,

  deactivated_at = (
    CASE
      WHEN $4::boolean = false THEN NULL
      WHEN $4 IS NULL  THEN NULL
      WHEN deactivated_at IS NULL AND $4 IS NOT NULL THEN CLOCK_TIMESTAMP()
    END
  ),

  terminated_at = (
    CASE
      WHEN $5 IS FALSE THEN NULL
      WHEN $5 IS NULL  THEN NULL
      WHEN terminated_at IS NULL AND $5 IS NOT NULL THEN CLOCK_TIMESTAMP()
    END
  )

WHERE id = $1
