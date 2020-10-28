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
  /* created_by */ $1,
  /* role_type */ $2,
  /* role */ $3,
  /* deal */ $4,
  /* "user */ COALESCE($5, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($14)
  )),
  /* brand */ $6,
  /* checklist */ $7,
  /* agent */ $8,
  /* company_title */ $9,
  /* legal_prefix */ $10,
  /* legal_first_name */ $11,
  /* legal_middle_name */ $12,
  /* legal_last_name */ $13,
  /* email */ lower($14),
  /* phone_number */ $15,
  /* current_address */ JSON_TO_STDADDR($16),
  /* future_address */ JSON_TO_STDADDR($17),
  /* commission_dollar */ $18,
  /* commission_percentage */ $19,
  /* office_name */ $20,
  /* office_email */ $21,
  /* office_phone */ $22,
  /* office_fax */ $23,
  /* office_license_number */ $24,
  /* office_mls_id */ $25,
  /* office_address */ JSON_TO_STDADDR($26),
  /* searchable */ to_tsvector('english',
    COALESCE($9, '')  || ' ' ||
    COALESCE($10, '') || ' ' ||
    COALESCE($11, '') || ' ' ||
    COALESCE($12, '') || ' ' ||
    COALESCE($13, '') || ' ' ||
    COALESCE(lower($14), '') || ' ' ||
    COALESCE($15, '') || ' ' ||
    COALESCE($20, '') || ' ' ||
    COALESCE($21, '') || ' ' ||
    COALESCE($22, '')
  )
)

RETURNING id
