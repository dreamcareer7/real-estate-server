SELECT INITCAP(LOWER(title)) AS title,
       number,
       parent,
       'mls_area' AS type
FROM mls_areas
WHERE
  number = $1 AND
  parent = $2
