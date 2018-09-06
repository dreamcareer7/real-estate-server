WITH u AS (
  UPDATE
    contacts_attribute_defs
  SET
    label = $2,
    section = $3,
    "required" = $4,
    singular = $5,
    searchable = $6,
    has_label = $7,
    labels = $8::text[],
    enum_values = $9::text[],
    updated_at = now(),
    updated_by = $10::uuid
  WHERE
    id = $1
)
SELECT
  update_searchable_field_by_attribute_def($1::uuid)