SELECT *,
       'attachment' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM attachments
JOIN unnest($1::uuid[]) WITH ORDINALITY t(aid, ord) ON attachments.id = aid
ORDER BY t.ord
