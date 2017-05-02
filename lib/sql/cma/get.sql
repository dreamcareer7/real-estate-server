SELECT *,
       'cma' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM cmas
JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON cmas.id = cid
ORDER BY t.ord
