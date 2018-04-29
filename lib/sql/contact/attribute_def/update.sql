UPDATE
  contacts_attribute_defs
SET
  label = $2,
  section = $3,
  "required" = $4,
  singular = $5
WHERE
  id = $1