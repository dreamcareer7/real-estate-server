SELECT
    'email_campaign_attachment' AS type,
    email_campaign_attachments.*
FROM
    email_campaign_attachments
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(ecaid, ord)
ON 
    email_campaign_attachments.id = ecaid
ORDER BY 
    t.ord