INSERT INTO showinghub.showable_listings (
  id,
  application_id,
  listing_id,
  created_on,
  upi,
  address1,
  city,
  state,
  zip_code,
  list_agent_mls_id,
  list_agent_name,
  list_agent_license_state_affirmation,
  list_agent_license_number,
  list_agent_license_state,
  showable_start_date,
  showable_end_date,
  showing_instructions,
  required_participants,
  showing_method,
  confirmation_type,
  showings_allowed,
  showing
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
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
  $16,
  $17,
  $18,
  $19,
  $20,
  $21,
  $22
)
ON CONFLICT (id) DO UPDATE SET
  listing_id = $3,
  upi = $5,
  address1 = $6,
  city = $7,
  state = $8,
  zip_code = $9,
  list_agent_mls_id = $10,
  list_agent_name = $11,
  list_agent_license_state_affirmation = $12,
  list_agent_license_number = $13,
  list_agent_license_state = $14,
  showable_start_date = $15,
  showable_end_date = $16,
  showing_instructions = $17,
  required_participants = $18,
  showing_method = $19,
  confirmation_type = $20,
  showings_allowed = $21