SELECT
  title,
  appearances,
  'subdivision' as type
FROM subdivisions
WHERE
  title ILIKE '%' || $1 || '%'
ORDER BY appearances DESC, title ASC
LIMIT 100;