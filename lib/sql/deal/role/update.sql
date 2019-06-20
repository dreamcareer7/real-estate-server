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

  office_name = $16,
  office_email = $17,
  office_phone = $18,
  office_fax = $19,
  office_license_number = $20,
  office_mls_id = $21,
  office_address = JSON_TO_STADDR($22),

  brokerwolf_id = $23,
  brokerwolf_row_version = $24,
  role = $25

WHERE id = $1
