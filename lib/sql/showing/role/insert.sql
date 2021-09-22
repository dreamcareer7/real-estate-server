INSERT INTO showings_roles (
  created_by,
  showing,
  role,
  "user",
  agent,
  brand,
  can_approve,
  confirm_notification_type,
  cancel_notification_type,
  first_name,
  last_name,
  email,
  phone_number
) SELECT
  $1::uuid,
  $2::uuid,
  "role",
  COALESCE(sr.user, (
    SELECT id FROM users WHERE LOWER(users.email) = LOWER(sr.email)
  )),
  COALESCE(sr.agent, (
    SELECT ua.agent FROM users AS u WHERE LOWER(u.email) = LOWER(sr.email)
      JOIN users_agents AS ua ON ua.user = u.id
      ORDER BY ua.id
      LIMIT 1
  )),
  brand,
  can_approve,
  confirm_notification_type,
  cancel_notification_type,
  first_name,
  last_name,
  email,
  phone_number
FROM
  json_to_recordset($3::json) AS sr (
    role deal_role,
    "user" uuid,
    agent uuid,
    brand uuid,
    can_approve boolean,
    confirm_notification_type notification_delivery_type[],
    cancel_notification_type notification_delivery_type[],
    first_name text,
    last_name text,
    email text,
    phone_number text
  )
RETURNING id
