SELECT
galleries.*,
EXTRACT(EPOCH FROM created_at) AS created_at,
EXTRACT(EPOCH FROM updated_at) AS updated_at,
EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
'gallery' as type,
(
  SELECT ARRAY_AGG(id)
  FROM gallery_items
  WHERE gallery = galleries.id
  AND deleted_at IS NULL
) as items

FROM galleries
JOIN unnest($1::uuid[]) WITH ORDINALITY t(gid, ord) ON galleries.id = gid
WHERE id = ANY($1::uuid[])
ORDER BY t.ord
