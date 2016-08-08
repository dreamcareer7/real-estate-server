SELECT *
  , 'school' as type
FROM schools
WHERE
name ILIKE '%' || $1 || '%'
ODER BY name ASC;
