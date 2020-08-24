SELECT
  COUNT(DISTINCT bu."user")::int as count
FROM brands_users bu
JOIN brands_roles br ON bu.role = br.id
WHERE br.brand IN(SELECT * FROM brand_children($1))
AND   bu.deleted_at IS NULL AND br.deleted_at IS NULL
