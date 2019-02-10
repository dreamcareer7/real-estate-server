SELECT
  id
FROM
  crm_lists
WHERE
  deleted_at IS NULL
  AND brand = ANY($1::uuid[])
  AND (CASE
    WHEN $2::uuid[] IS NOT NULL THEN
      (created_by = ANY($2::uuid[])) OR (created_by IS NULL)
    ELSE
      TRUE
  END)
ORDER BY
  is_editable,
  created_at
