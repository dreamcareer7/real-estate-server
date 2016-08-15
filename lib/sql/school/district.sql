SELECT *, 'school' as type FROM schools WHERE district = ANY($1)
ORDER BY title ASC, appearances DESC;