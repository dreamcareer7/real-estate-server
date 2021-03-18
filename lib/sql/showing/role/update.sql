UPDATE
  showings_roles
SET
  updated_by = $2::uuid,
  updated_at = now(),
  role = $3::deal_role,
  user = COALESCE($4::uuid, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($9)
  )),
  confirm_notification_type = $5::boolean,
  cancel_notification_type = $6::boolean,
  can_approve = $7::boolean,
  first_name = $8,
  last_name = $9,
  email = $10,
  phone_number = $11
WHERE
  id = $1::uuid
