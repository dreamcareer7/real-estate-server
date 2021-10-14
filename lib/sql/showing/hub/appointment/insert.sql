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