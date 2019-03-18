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
  company_title = $11,
  commission_dollar = $12,
  commission_percentage = $13,
  brokerwolf_id = $14,
  brokerwolf_row_version = $15,
  role = $16

WHERE id = $1
