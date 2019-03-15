INSERT INTO deals_roles (
  created_by,
  role_type,
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
  commission_percentage,
  checklist
) VALUES (
  $1,
  $2,
  $3,
  $4,
  COALESCE($5, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($11)
  )),
  $6,
  $7,
  $8,
  $9,
  $10,
  $11,
  $12,
  $13,
  $14,
  $15
)

RETURNING id
