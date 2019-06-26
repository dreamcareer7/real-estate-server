SELECT
    id, google_credential, entry_id, 'google_contact' AS type
FROM
    google_contacts
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(gc_ei, ord)
ON 
    google_contacts.entry_id = gc_ei
    AND google_contacts.google_credential = $2
ORDER BY 
    t.ord