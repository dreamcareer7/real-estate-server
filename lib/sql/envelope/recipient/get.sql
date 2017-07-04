SELECT envelopes_recipients.*,
       'envelope_recipient' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM envelopes_recipients
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON envelopes_recipients.id = rid
ORDER BY t.ord
