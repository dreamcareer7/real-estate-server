SELECT
  listing
FROM recommendations
WHERE
  deleted_at IS NULL AND
  hidden = FALSE AND
  ARRAY[$1::uuid] IN (referring_objects)
ORDER BY created_at DESC