INSERT INTO showings_roles (
  created_by,
  showing,
  role,
  user,
  brand,
  confirm_notification_type,
  cancel_notification_type,
  can_approve,
  first_name,
  last_name,
  email,
  phone_number
) VALUES (
  /* created_by */ $1::uuid,
  /* showing */ $2::uuid,
  /* role */ $3::deal_role,
  /* user */ COALESCE($4, (
    SELECT id FROM users WHERE LOWER(email) = LOWER($10)
  )),
  /* brand */ $5::uuid,
  /* confirm_notification_type */ $6::notification_delivery_type,
  /* cancel_notification_type */ $7::notification_delivery_type,
  /* can_approve */ $8::boolean,
  /* first_name */ $9,
  /* last_name */ $10,
  /* email */ $11,
  /* phone_number */ $12
)
