INSERT INTO deals_roles(
  created_by,
  role,
  deal,
  "user",
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
  commission
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9
)
ON CONFLICT DO NOTHING