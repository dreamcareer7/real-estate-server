INSERT INTO deals_roles (
  created_by,
  role_type,
  role,
  deal,
  "user",
  brand,
  checklist,
  agent,
  company_title,
  legal_prefix,
  legal_first_name,
  legal_middle_name,
  legal_last_name,
  email,
  phone_number,
  current_address,
  future_address,
  commission_dollar,
  commission_percentage,
  office_name,
  office_email,
  office_phone,
  office_fax,
  office_license_number,
  office_mls_id,
  office_address,
  searchable
) VALUES (
  $1,
  $2,
  $3,
  $4,
  COALESCE($5, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($14)
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
  $15,
  JSON_TO_STDADDR($16),
  JSON_TO_STDADDR($17),
  $18,
  $19,
  $20,
  $21,
  $22,
  $23,
  $24,
  $25,
  JSON_TO_STDADDR($26),
  to_tsvector('english',
    COALESCE($9, '')  || ' ' ||
    COALESCE($10, '') || ' ' ||
    COALESCE($11, '') || ' ' ||
    COALESCE($12, '') || ' ' ||
    COALESCE($13, '') || ' ' ||
    COALESCE($14, '') || ' ' ||
    COALESCE($15, '') || ' ' ||
    COALESCE($20, '') || ' ' ||
    COALESCE($21, '') || ' ' ||
    COALESCE($22, '')
  )
)

RETURNING id
