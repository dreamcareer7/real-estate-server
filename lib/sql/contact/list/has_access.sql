SELECT
  id,
  (brand = $2::uuid) AS "read",
  (brand = $2::uuid AND is_editable IS TRUE) AS "write"
FROM
  crm_lists
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON id = did
WHERE
  deleted_at IS NULL
