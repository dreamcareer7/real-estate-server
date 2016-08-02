SELECT
  title,
  'county' as type
FROM counties
WHERE
  title ILIKE '%' || $1 || '%'