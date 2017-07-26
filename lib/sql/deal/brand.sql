SELECT
  DISTINCT tasks.deal AS id
FROM tasks
WHERE
  deleted_at IS NULL
  AND brand IN(SELECT brand_children($1))
  AND needs_attention = true
ORDER BY updated_at DESC