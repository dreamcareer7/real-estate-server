SELECT
    microsoft_contacts.*, 'microsoft_contact' AS type
FROM
    microsoft_contacts
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(mc_ri, ord)
ON 
    microsoft_contacts.remote_id = mc_ri
    AND microsoft_contacts.microsoft_credential = $2
ORDER BY 
    t.ord