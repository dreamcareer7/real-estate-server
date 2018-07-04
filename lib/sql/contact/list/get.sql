WITH counts AS (
  SELECT
    list AS id,
    count(contact) AS member_count
  FROM
    contact_lists_members
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
  "user",
  filters,
  name,
  is_pinned,
  COALESCE(member_count::int, 0) AS member_count,
  'contact_list' AS "type"
FROM
  contact_search_lists
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON contact_search_lists.id = cid
  LEFT JOIN counts USING(id)