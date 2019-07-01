SELECT
    id, microsoft_credential, entry_id, 'microsoft_contact' AS type
FROM
    microsoft_contacts
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(mc_ri, ord)
ON 
    microsoft_contacts.entry_id = mc_ri
    AND microsoft_contacts.microsoft_credential = $2
ORDER BY 
    t.ord