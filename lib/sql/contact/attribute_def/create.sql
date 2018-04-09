INSERT INTO
  contacts_attribute_defs
    (created_by, "user", data_type, label, section, "required", "global", singular, show, editable)
VALUES
  ($1, $1, $2, $3, $4, $5, false, $6, true, true)
RETURNING
  id