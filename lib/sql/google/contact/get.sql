SELECT
    id, google_credential, resource_name, 'google_contact' AS type
FROM
    google_contacts
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(gc_rn, ord)
ON 
    google_contacts.resource_name = gc_rn
    AND google_contacts.google_credential = $2
ORDER BY 
    t.ord