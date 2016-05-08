SELECT COUNT(*) AS count
FROM recommendations
WHERE $1 = ANY(referring_objects)
