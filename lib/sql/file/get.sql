SELECT files.*,
       'file' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM files
JOIN unnest($1::uuid[]) WITH ORDINALITY t(fid, ord) ON files.id = fid
ORDER BY t.ord
