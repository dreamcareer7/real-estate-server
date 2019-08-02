SELECT
    google_messages.*, 'google_messages' AS type
FROM
    google_messages
JOIN 
    unnest($1::text[]) WITH ORDINALITY t(gmid, ord)
ON 
    google_messages.message_id = gmid
    AND google_messages.google_credential = $2
ORDER BY 
    t.ord