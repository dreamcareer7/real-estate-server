INSERT INTO showings_approvals (
  appointment,
  role,
  approved,
  time,
  comment
) VALUES (
  $1::uuid,
  $2::uuid,
  $3::boolean,
  $4::timestamptz,
  $5
)
ON CONFLICT ON CONSTRAINT
  showings_approvals_appointment_role_time_key
DO UPDATE SET
  approved = $3::boolean,
  comment = $5
