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
  phone_number = $9,
  company_title = $10,
  commission_dollar = $11,
  commission_percentage = $12,
  brokerwolf_id = $13,
  brokerwolf_row_version = $14,
  role = $15

WHERE id = $1
