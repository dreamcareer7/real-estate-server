UPDATE deals SET
  listing = $2,
  brokerwolf_id = $3,
  brokerwolf_tier_id = $4,
  brokerwolf_row_version = $5
WHERE id = $1