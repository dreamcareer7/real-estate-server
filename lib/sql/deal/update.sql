UPDATE deals SET
  listing = $2,
  faired_at = (
    CASE
      WHEN $3::boolean IS TRUE THEN NULL
      WHEN faired_at IS NULL AND $3 IS NOT NULL THEN CLOCK_TIMESTAMP()
      ELSE faired_at
    END
  ),

  title = $4,
  property_type = $5

WHERE id = $1
