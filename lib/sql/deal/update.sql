 UPDATE deals SET
  context = $1,
  flags = $2,
  updated_at = CLOCK_TIMESTAMP()
WHERE id = $3
