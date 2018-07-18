UPDATE deals SET
  listing = $2,
  is_draft = $3,
  brokerwolf_id = $4,
  brokerwolf_tier_id = $5,
  brokerwolf_row_version = $6,
  title = $7
WHERE id = $1