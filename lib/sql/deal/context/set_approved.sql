UPDATE deal_context SET
  approved_at = (CASE WHEN $2::boolean IS TRUE THEN CLOCK_TIMESTAMP() ELSE NULL END),
  approved_by = (CASE WHEN $2::boolean IS TRUE THEN $3::uuid ELSE NULL END)
WHERE id = $1