WITH templates AS (
  SELECT
    brand.brand,
    brands_forms_templates.submission as submission
  FROM brand_parents($1::uuid) brand
    JOIN brands_forms_templates ON brand.brand = brands_forms_templates.brand
    WHERE brands_forms_templates.form = $2
)

SELECT
  DISTINCT ON (forms_data.submission)
  forms_data.id as revision,
  templates.brand
FROM templates
JOIN forms_data ON templates.submission = forms_data.submission
ORDER BY forms_data.submission, forms_data.created_at DESC