SELECT
  id,
  EXTRACT(epoch FROM created_at) AS created_at,
  EXTRACT(epoch FROM updated_at) AS updated_at,
  created_by,
  updated_by,
  brand,
  title,
  description,
  task_type,
  EXTRACT(epoch FROM reminder) AS reminder,

  'brand_event' AS type
FROM
  brands_events
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_events.id = bid
ORDER BY
  t.ord
