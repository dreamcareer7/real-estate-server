SELECT
  initcap(lower(title)) as title,
  number,
  parent,
  'mls_area' as type
FROM mls_areas
WHERE
  number = $1 AND parent = $2