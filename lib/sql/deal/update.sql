 UPDATE deals SET
  context = $1,
  updated_at = CLOCK_TIMESTAMP()
WHERE id = $2
