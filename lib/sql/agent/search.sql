SELECT
id
FROM agents
WHERE
  ((first_name || ' ' || middle_name || ' ' || last_name) ILIKE '%' || $1 || '%'
  OR full_name ILIKE '%' || $1 || '%'
  OR license_number ILIKE '%' || $1 || '%'
  OR mlsid ILIKE '%' || $1 || '%'
)
AND status = 'Active'
AND deleted_at IS NULL
AND (
  CASE
    WHEN $2::mls[] IS NULL THEN TRUE
    ELSE mls = ANY($2::mls[])
  END
)

ORDER BY first_name, last_name
