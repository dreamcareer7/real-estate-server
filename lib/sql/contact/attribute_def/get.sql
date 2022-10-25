SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  created_by,
  updated_by,
  "name",
  data_type,
  label,
  section,
  "required",
  "global",
  singular,
  show,
  filterable,
  editable,
  searchable,
  has_label,
  labels,
  enum_values,
  "user",
  brand,
  'contact_attribute_def' as "type"
FROM
  contacts_attribute_defs
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON contacts_attribute_defs.id = cid
    ORDER BY t.ord
