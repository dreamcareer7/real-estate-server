INSERT INTO showings_appointments (
  source,
  time,
  showing,
  contact,
  status
) VALUES (
  $1::text,
  $2::timestamptz,
  $3::uuid,
  $4::uuid,
  $5::showing_appointment_status
)
RETURNING id
