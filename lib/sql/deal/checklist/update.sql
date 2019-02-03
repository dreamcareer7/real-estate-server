UPDATE deals_checklists SET
  title = $2,
  "order" = $3,

  deactivated_at = (
    CASE
      WHEN $4::boolean = false THEN NULL
      WHEN $4 IS NULL  THEN NULL
      WHEN deactivated_at IS NULL AND $4 IS NOT NULL THEN CLOCK_TIMESTAMP()
      ELSE deactivated_at
    END
  ),

  terminated_at = (
    CASE
      WHEN $5::boolean = false THEN NULL
      WHEN $5 IS NULL  THEN NULL
      WHEN terminated_at IS NULL AND $5 IS NOT NULL THEN CLOCK_TIMESTAMP()
      ELSE terminated_at
    END
  ),

  faired_at = (
    CASE
      WHEN $6::boolean IS TRUE THEN NULL
      WHEN faired_at IS NULL AND $6 IS NOT NULL THEN CLOCK_TIMESTAMP()
      ELSE faired_at
    END
  )

WHERE id = $1
