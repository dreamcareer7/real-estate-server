SELECT
    *, 'google_auth_link' AS type
FROM
    google_auth_links
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gid, ord)
ON 
    google_auth_links.id = gid
ORDER BY 
    t.ord