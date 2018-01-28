UPDATE deals_roles SET
  legal_prefix = $2,
  legal_first_name = $3,
  legal_middle_name = $4,
  legal_last_name = $5,
  "user" = COALESCE($6, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($7)
  )),
  email = $7,
  phone_number = $8,
  company_title = $9,
  commission_dollar = $10,
  commission_percentage = $11,
  brokerwolf_id = $12,
  brokerwolf_row_version = $13,
  role = $14

WHERE id = $1