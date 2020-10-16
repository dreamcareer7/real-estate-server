SELECT
  *
FROM
  brands_events
WHERE
  brand = $1::uuid
  AND deleted_at IS NULL
