UPDATE websites SET
  template = $1,
  brand = $2,
  attributes = $3
WHERE id = $4