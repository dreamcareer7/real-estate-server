SELECT
    id, microsoft_credential, message_id, conversation_id, recipients, in_bound, 'microsoft_message' AS type
FROM
    microsoft_messages
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(mmid, ord)
ON 
    microsoft_messages.message_id = mmid
    AND microsoft_messages.microsoft_credential = $2
ORDER BY 
    t.ord