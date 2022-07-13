-- $1: contact: uuid
-- $2: role: contact_role
-- $3: created_by: uuid
-- $4: json: { brand: uuid, user: uuid }[]

INSERT INTO contact_roles (
  contact,
  role,
  created_by,
  brand,
  "user"
)
SELECT
  $1::uuid,
  $2::contact_role,
  $3::uuid,
  bu.brand,
  bu."user"
FROM json_to_recordset($4::json) AS bu (
  brand uuid,
  "user" uuid
)
ON CONFLICT ON CONSTRAINT brand_contact_user_role_uniq DO UPDATE SET
  deleted_at = NULL,
  updated_at = now(),
  created_by = EXCLUDED.created_by
RETURNING id
