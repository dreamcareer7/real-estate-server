SELECT count(*) > 0 AS is
FROM brands
WHERE
id IN(SELECT brand_parents($1))
AND training IS TRUE
