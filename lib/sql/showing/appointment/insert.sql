INSERT INTO showings_appointments (
  source,
  time,
  status,
  contact
) VALUES (
  $1::text,
  $2::timestamptz,
  $3::uuid,
  $4::uuid
)
