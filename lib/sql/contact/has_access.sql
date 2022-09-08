WITH assigned_contacts AS MATERIALIZED (
  SELECT array_agg(cr.contact) AS assigned_contacts
  FROM contacts_roles AS cr
  WHERE cr.deleted_at IS NULL
    AND cr.brand = $2::uuid
    AND cr.user = $3::uuid
    AND cr.role = 'assignee'::contact_role
)
SELECT
  c.id,
  c.brand = $2::uuid OR c.id = ANY(ac.assigned_contacts) AS "read",
  c.brand = $2::uuid OR c.id = ANY(ac.assigned_contacts) AS "write",
  c.brand = $2::uuid AS "delete"
FROM
  contacts AS c
CROSS JOIN assigned_contacts AS ac
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON c.id = did
WHERE
  c.deleted_at IS NULL
