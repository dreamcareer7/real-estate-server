INSERT INTO showings_appointments (
  source,
  time,
  showing,
  contact,
  status,
  email
) VALUES (
  $1::text,
  $2::timestamptz,
  $3::uuid,
  $4::uuid,
  $5::showing_appointment_status,
  $6::text
)
RETURNING id
