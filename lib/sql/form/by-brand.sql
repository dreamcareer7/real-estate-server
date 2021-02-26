SELECT forms.id, form_libraries.name as library
FROM forms
JOIN form_libraries ON forms.library = form_libraries.id
LEFT JOIN form_libraries_brands flb ON form_libraries.id = flb.library AND flb.brand = $1
WHERE forms.deleted_at IS NULL
AND (
  (
    forms.brand IS NULL
    OR forms.brand IN (
      SELECT brand_parents($1::uuid)
    )
  )
  OR
  (
    flb.id IS NOT NULL
  )
)
ORDER BY forms.name ASC
