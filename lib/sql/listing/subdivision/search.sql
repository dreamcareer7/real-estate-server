SELECT
  title,
  'subdivision' as type
FROM subdivisions
WHERE
  title ILIKE '%' || $1 || '%'