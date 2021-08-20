SELECT
  name
FROM
  contacts_attribute_defs
WHERE
  global AND
  deleted_at IS NULL AND
  data_type = $1::attribute_data_types
ORDER BY
  name
