WITH counts AS (
  SELECT
    list AS id,
    count(contact) AS member_count
  FROM
    crm_lists_members
  WHERE
    list = ANY($1::uuid[])
    AND deleted_at IS NULL
  GROUP BY
    list
)
SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  created_by,
  updated_by,
  brand,
  (
    SELECT
      json_agg(clf.*)
    FROM
      crm_lists_filters AS clf
    WHERE
      clf.crm_list = crm_lists.id
  ) AS filters,
  query,
  json_build_object(
    'filter_type', CASE WHEN is_and_filter IS TRUE THEN 'and' ELSE 'or' END,
    'query', query
  ) AS args,
  name,
  is_editable,
  touch_freq,
  COALESCE(member_count::int, 0) AS member_count,
  'contact_list' AS "type"
FROM
  crm_lists
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON crm_lists.id = cid
  LEFT JOIN counts USING(id)
ORDER BY
  t.ord
