SELECT
  id
FROM
  offices
WHERE
  (
    long_name ILIKE '%' || $1 || '%'
    OR name   ILIKE '%' || $1 || '%'
    OR mls_id ILIKE '%' || $1 || '%'
  )

  AND status = 'Active'
  AND CASE WHEN $2::mls IS NULL THEN TRUE ELSE mls = $2::mls END
