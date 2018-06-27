INSERT INTO
  contacts_attribute_defs
    (created_by, brand, name, data_type, label, section, "global", "required", singular, show, editable, searchable, has_label, labels, enum_values)
VALUES
  ($1, $2, $3, $4, $5, $6, false, $7, $8, true, true, $9, $10, $11::text[], $12::text[])
RETURNING
  id