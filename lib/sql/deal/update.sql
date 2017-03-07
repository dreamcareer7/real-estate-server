 UPDATE deals SET
  context = $1,
  updated_at = NOW()
WHERE id = $2