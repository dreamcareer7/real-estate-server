SELECT
    *, 'gmail' AS type
FROM
    gmails
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gid, ord)
ON 
    gmails.id = gid
ORDER BY 
    t.ord