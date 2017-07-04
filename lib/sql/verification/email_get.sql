SELECT email_verifications.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       'email_verification' AS type
FROM email_verifications
JOIN unnest($1::uuid[]) WITH ORDINALITY t(vid, ord) ON email_verifications.id = vid
ORDER BY t.ord
