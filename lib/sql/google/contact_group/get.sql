SELECT
    *, 'google_contact_group' AS type
FROM
    google_contact_groups
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(gcgid, ord)
ON 
    google_contact_groups.id = gcgid
ORDER BY 
    t.ord