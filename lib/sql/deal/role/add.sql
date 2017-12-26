INSERT INTO deals_roles (
  created_by,
  role,
  deal,
  "user",
  company_title,
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
  email,
  phone_number,
  commission_dollar,
  commission_percentage
) VALUES (
  $1,
  $2,
  $3,
  COALESCE($4, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($10)
  )),
  $5,
  $6,
  $7,
  $8,
  $9,
  $10,
  $11,
  $12,
  $13
)