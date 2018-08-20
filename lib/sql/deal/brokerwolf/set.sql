UPDATE deals SET
  brokerwolf_id = $2,
  brokerwolf_tier_id = $3,
  brokerwolf_row_version = $4
WHERE id = $1