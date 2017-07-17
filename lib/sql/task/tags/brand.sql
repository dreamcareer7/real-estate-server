SELECT
  *,
  (
    SELECT ARRAY_AGG(tag) FROM brand_tasks_tags WHERE task = brand_tasks.id
  ) as tags
FROM brand_tasks
WHERE brand = $1 AND flags && $2