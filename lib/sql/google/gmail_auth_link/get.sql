SELECT
    *, 'gmail_auth_link' AS type
FROM
    gmail_auth_links
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gid, ord)
ON 
    gmail_auth_links.id = gid
ORDER BY 
    t.ord