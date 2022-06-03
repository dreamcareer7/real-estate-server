INSERT INTO showings_appointments (
  source,
  time,
  showing,
  contact,
  status,
  email,
  phone_number,
  first_name,
  last_name,
  company
) VALUES (
  $1::text,
  $2::timestamptz,
  $3::uuid,
  $4::uuid,
  $5::showing_appointment_status,
  $6::text,
  $7::text,
  $8::text,
  $9::text,
  $10::text
)
RETURNING id
