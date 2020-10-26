INSERT INTO crm_leads (
  brand,
  "user",
  -- lead_owner,
  -- lead_id,
  data
) VALUES (
  $1::uuid,
  $2::uuid,
  $3::xml
)
RETURNING id
