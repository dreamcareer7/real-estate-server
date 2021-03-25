INSERT INTO showings_appointments (
  source,
  time,
  showing,
  contact
) VALUES (
  $1::text,
  $2::timestamptz,
  $3::uuid,
  $4::uuid
)
RETURNING id
