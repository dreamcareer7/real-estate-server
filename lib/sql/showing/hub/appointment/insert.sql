INSERT INTO showinghub.appointments (
  id,

  created_on,
  modified_on,

  actual_start_date,
  actual_end_date,
  appointment_type,
  appointment_method,

  buying_agent_id,
  buying_agent_name,
  buying_agent_license_state_affirmation,
  buying_agent_license_number,
  buying_agent_license_state,
  buying_agent_mls_id,

  appointment_status,
  appointment
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
  $15
)
ON CONFLICT (id) DO UPDATE SET
  actual_start_date = $4,
  actual_end_date = $5,
  appointment_type = $6,
  appointment_method = $7,

  buying_agent_id = $8,
  buying_agent_name = $9,
  buying_agent_license_state_affirmation = $10,
  buying_agent_license_number = $11,
  buying_agent_license_state = $12,
  buying_agent_mls_id = $13,
  appointment_status = $14