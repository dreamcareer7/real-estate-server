UPDATE
  showings_roles
SET
  updated_at = now(),
  role = $2::deal_role,
  "user" = COALESCE($3::uuid, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($9)
  )),
  confirm_notification_type = $4::boolean,
  cancel_notification_type = $5::boolean,
  can_approve = $6::boolean,
  first_name = $7,
  last_name = $8,
  email = $9,
  phone_number = $10
WHERE
  id = $1::uuid
