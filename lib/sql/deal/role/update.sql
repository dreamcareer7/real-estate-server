UPDATE deals_roles SET
  legal_prefix = $2,
  legal_first_name = $3,
  legal_middle_name = $4,
  legal_last_name = $5,
  company_title = $6,
  commission_dollar = $7,
  commission_percentage = $8,
  brokerwolf_id = $9,
  brokerwolf_row_version = $10

WHERE id = $1