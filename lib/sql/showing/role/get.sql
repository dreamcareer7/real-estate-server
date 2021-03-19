SELECT
  r.id,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,
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
  phone_number,

  'showing_role' AS type
FROM
  showings_roles AS r
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = r.id
ORDER BY
  t.ord
