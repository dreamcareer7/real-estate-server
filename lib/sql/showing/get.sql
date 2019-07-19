SELECT
    *, 'showings' AS type
FROM
    showings
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(sid, ord)
ON 
    showings.id = sid
ORDER BY 
    t.ord