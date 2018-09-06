WITH lists AS (
  SELECT
    contact AS id,
    array_agg(list) as lists
  FROM
    contact_lists_members
    JOIN contact_search_lists
      ON contact_search_lists.id = list
  WHERE
    contact_search_lists.deleted_at IS NULL
    AND contact_lists_members.deleted_at IS NULL
    AND contact = ANY($1::uuid[])
  GROUP BY
    contact
)
SELECT
  id,
  display_name,
  sort_field,
  extract(epoch FROM last_touch) AS last_touch,
  extract(epoch FROM next_touch) AS next_touch,
  id AS summary,
  lists,
  ARRAY[id] AS sub_contacts,
  extract(epoch FROM created_at) as created_at,
  extract(epoch FROM updated_at) as updated_at,
  extract(epoch FROM deleted_at) as deleted_at,
  created_by,
  updated_by,
  'contact' as type
FROM
  contacts
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON contacts.id = t.cid
  LEFT JOIN lists USING (id)
ORDER BY
  t.ord