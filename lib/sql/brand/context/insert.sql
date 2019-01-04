INSERT INTO brands_contexts (
  brand,
  key,
  label,
  short_label,
  "order",
  section,
  needs_approval,
  exports,
  preffered_source,
  default_value,
  data_type,
  format,
  required,
  optional,
  triggers_brokerwolf
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
RETURNING id
