SELECT forms.*,
       'form' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       name
FROM forms
LEFT JOIN unnest($1::uuid[]) WITH ORDINALITY t(fid, ord) ON forms.id = fid
WHERE $1::uuid[] IS NULL OR
      t.fid IS NOT NULL
ORDER BY t.ord
