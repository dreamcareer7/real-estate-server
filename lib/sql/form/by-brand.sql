WITH f AS (
  SELECT DISTINCT forms.id, forms.name
  FROM forms
  LEFT JOIN form_libraries ON forms.library = form_libraries.id
  LEFT JOIN form_libraries_brands flb ON form_libraries.id = flb.library
  WHERE forms.deleted_at IS NULL
  AND (
    (
      (forms.brand IS NULL AND forms.library IS NULL)
      OR forms.brand IN (
        SELECT brand_parents($1::uuid)
      )
    )
    OR
    (
      flb.id IS NOT NULL AND (
        flb.brand IN (
          SELECT brand_parents($1::uuid)
        )
      )
    )
  )
)
SELECT * FROM f ORDER BY name ASC
