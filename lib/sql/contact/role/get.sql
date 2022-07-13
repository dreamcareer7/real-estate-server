SELECT
  'contact_role' AS type,
  cr.id,
  cr.brand,
  cr.contact,
  cr."user",
  cr.role,
  cr.created_at,
  cr.updated_at,
  cr.deleted_at,
  cr.created_by
FROM
  contact_roles AS cr
  JOIN unnest($1::uuid[]) WITH ORDINALITY inp(id, ord)
    ON cr.id = inp.id
ORDER BY
  inp.ord
