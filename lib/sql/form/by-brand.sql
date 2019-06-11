SELECT id
FROM forms
WHERE deleted_at IS NULL
AND (
  brand IS NULL
  OR brand IN(
    SELECT brand_parents($1::uuid)
  )
)
ORDER BY name ASC
