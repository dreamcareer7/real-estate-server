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
