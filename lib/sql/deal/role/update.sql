UPDATE deals_roles SET
  legal_prefix = $2,
  legal_first_name = $3,
  legal_middle_name = $4,
  legal_last_name = $5,
  email = $6,
  phone_number = $7,
  company_title = $8,
  commission_dollar = $9,
  commission_percentage = $10,
  brokerwolf_id = $11,
  brokerwolf_row_version = $12

WHERE id = $1