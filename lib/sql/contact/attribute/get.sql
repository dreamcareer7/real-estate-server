SELECT
  id,
  contact,
  attribute_def,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  label,
  is_primary,
  created_by,
  "name" as attribute_type,
  "text",
  EXTRACT(EPOCH FROM "date") AS "date",
  "number",
  'contact_attribute' as "type"
FROM
  contacts_attributes_with_name
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON id = cid
    ORDER BY t.ord
