UPDATE deals_roles SET
  commission = $2,
  brokerwolf_id = $3,
  brokerwolf_row_version = $4

WHERE id = $1