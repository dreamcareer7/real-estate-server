UPDATE brands_forms_templates SET
name = $1,
deal_types = $2,
property_types = $3
WHERE id = $4
