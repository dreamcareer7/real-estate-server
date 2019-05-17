UPDATE deals_roles SET
  role_type = $2,
  legal_prefix = $3,
  legal_first_name = $4,
  legal_middle_name = $5,
  legal_last_name = $6,
  "user" = COALESCE($7, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($8)
  )),
  email = $8,
  agent = $9,
  phone_number = $10,
  current_address = $11,
  future_address = $12,
  company_title = $13,
  commission_dollar = $14,
  commission_percentage = $15,
  brokerwolf_id = $16,
  brokerwolf_row_version = $17,
  role = $18

WHERE id = $1
