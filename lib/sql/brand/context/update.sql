UPDATE brands_contexts SET
  key = $2,
  label = $3,
  short_label = $4,
  "order" = $5,
  section = $6,
  needs_approval = $7,
  exports = $8,
  preffered_source = $9,
  default_value = $10,
  data_type = $11,
  format = $12,
  triggers_brokerwolf = $13
WHERE id = $1
