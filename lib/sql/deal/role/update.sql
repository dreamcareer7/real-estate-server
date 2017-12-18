UPDATE deals_roles SET
  commission_dollar = $2,
  commission_percentage = $3,
  brokerwolf_id = $4,
  brokerwolf_row_version = $5

WHERE id = $1