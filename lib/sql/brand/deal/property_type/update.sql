UPDATE brands_property_types SET
  label = $2,
  is_lease = $3,
  required_roles = $4,
  optional_roles = $5
WHERE id = $1
