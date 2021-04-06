UPDATE brands_property_types SET
  label = $2,
  is_lease = $3
WHERE id = $1
