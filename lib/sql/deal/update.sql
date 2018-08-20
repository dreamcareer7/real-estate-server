UPDATE deals SET
  listing = $2,
  is_draft = $3,
  title = $4
WHERE id = $1