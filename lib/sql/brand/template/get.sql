SELECT
  brands_form_templates.*,
  'form_template' as type
FROM brands_form_templates
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON brands_form_templates.id = tid
ORDER BY t.ord
