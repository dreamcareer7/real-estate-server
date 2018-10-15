SELECT
  brands_forms_templates.*,
  'form_template' as type
FROM brands_forms_templates
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON brands_forms_templates.id = tid
ORDER BY t.ord
