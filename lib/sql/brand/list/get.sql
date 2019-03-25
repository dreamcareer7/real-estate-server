SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  brand,
  filters,
  query,
  json_build_object(
    'filter_type', CASE WHEN is_and_filter IS TRUE THEN 'and' ELSE 'or' END,
    'q', query,
    'type', 'brand_list_args'
  ) AS args,
  name,
  touch_freq,
  'brand_list' AS "type"
FROM
  brands_lists
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord)
    ON brands_lists.id = cid
ORDER BY
  t.ord
