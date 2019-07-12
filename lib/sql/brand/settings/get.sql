SELECT
  id,
  brand,
  key,
  value,
  'brand_settings' AS "type"
FROM
  brands_settings
WHERE
  brand = $1::uuid
