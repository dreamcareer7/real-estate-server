SELECT
gallery_items.*,
EXTRACT(EPOCH FROM created_at) AS created_at,
EXTRACT(EPOCH FROM updated_at) AS updated_at,
EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
'gallery_item' as type
FROM gallery_items
JOIN unnest($1::uuid[]) WITH ORDINALITY t(giid, ord) ON gallery_items.id = giid
WHERE id = ANY($1::uuid[])
ORDER BY t.ord
