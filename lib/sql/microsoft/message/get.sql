SELECT
    microsoft_messages.*, 'microsoft_message' AS type
FROM
    microsoft_messages
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(mmid, ord)
ON 
    microsoft_messages.message_id = mmid
    AND microsoft_messages.microsoft_credential = $2
ORDER BY 
    t.ord