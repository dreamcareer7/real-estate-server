WITH related_contacts_roles AS (
  SELECT *
  FROM all_contacts_roles AS cr
  WHERE
    cr.role_user = $3::uuid OR (
      cr.role_brand = $2::uuid AND
      cr.role_type = 'owner'::contact_role
    )
)
SELECT
  c.id,
  bool_or(cr.role_contact IS NOT NULL) as "read",
  bool_or(cr.role_contact IS NOT NULL) as "write",
  bool_or(cr.role_type IS NOT DISTINCT FROM 'owner') AS "delete"
FROM
  contacts AS c
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON c.id = did
LEFT JOIN
  related_contacts_roles AS cr ON cr.role_contact = c.id
WHERE
  c.deleted_at IS NULL
GROUP BY
  c.id
