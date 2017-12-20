UPDATE deals_roles SET
  legal_prefix = $2,
  legal_first_name = $3,
  legal_middle_name = $4,
  legal_last_name = $5,
  commission_dollar = $6,
  commission_percentage = $7,
  brokerwolf_id = $8,
  brokerwolf_row_version = $9

WHERE id = $1