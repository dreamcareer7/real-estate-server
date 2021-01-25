SELECT
    microsoft_contacts.*, 'microsoft_contact' AS type
FROM
    microsoft_contacts
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(mc_ri, ord)
ON 
    microsoft_contacts.remote_id = mc_ri
    AND microsoft_contacts.microsoft_credential = $2
    AND microsoft_contacts.source = $3
ORDER BY 
    t.ord