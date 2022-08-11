UPDATE
  showings_roles
SET
  updated_at = now(),
  role = $2::showing_role,
  "user" = COALESCE($3::uuid, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($10)
  )),
  agent = $4::uuid,
  confirm_notification_type = $5::notification_delivery_type[],
  cancel_notification_type = $6::notification_delivery_type[],
  can_approve = $7::boolean,
  first_name = $8,
  last_name = $9,
  email = $10,
  phone_number = $11
WHERE
  id = $1::uuid
