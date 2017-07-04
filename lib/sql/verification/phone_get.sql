SELECT phone_verifications.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       'phone_verification' AS type
FROM phone_verifications
JOIN unnest($1::uuid[]) WITH ORDINALITY t(vid, ord) ON phone_verifications.id = vid
ORDER BY t.ord
