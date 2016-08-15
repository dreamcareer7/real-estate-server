SELECT *, 'school' as type FROM schools WHERE district = ANY($1)
ORDER BY name ASC, appearances DESC;