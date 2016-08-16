SELECT *
  , 'school' as type
FROM schools
WHERE
name ILIKE '%' || $1 || '%'
ORDER BY name ASC, appearances DESC;
