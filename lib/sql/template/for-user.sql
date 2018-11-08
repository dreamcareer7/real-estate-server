WITH user_brands AS (
  SELECT DISTINCT brand_parents(brands_roles.brand) as brand
  FROM brands_users
  JOIN brands_roles ON brands_users.role = brands_roles.id
  WHERE brands_users.user = $1::uuid
)

SELECT id FROM templates
WHERE brand IS NULL
OR brand IN(SELECT brand FROM user_brands)
AND $2 @> ARRAY[template_type]
AND deleted_at IS NULL
ORDER BY name ASC
