SELECT
    *, 'google_message' AS type
FROM
    google_messages
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gmid, ord)
ON 
    google_messages.id = gmid
ORDER BY 
    t.ord