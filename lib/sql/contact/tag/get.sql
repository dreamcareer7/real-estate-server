SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  created_by,
  updated_by,
  tag,
  tag AS text,
  touch_freq,
  'crm_tag' AS type
FROM
  crm_tags
WHERE
  brand = $1::uuid
  AND deleted_at IS NULL
ORDER BY
  tag
