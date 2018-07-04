WITH all_contacts AS (
  SELECT
    c1.id,
    c2.id AS parent,
    c1.display_name,
    array_agg(c1.id) OVER (PARTITION BY c2.id) AS sub_contacts,
    first_value(c1.created_at) OVER (PARTITION BY c2.id ORDER BY c1.created_at) AS created_at,
    last_value (c1.updated_at) OVER (PARTITION BY c2.id ORDER BY c1.updated_at) AS updated_at,
    c2.deleted_at
  FROM
    contacts c1,
    contacts c2
  WHERE
    coalesce(c2.parent, c2.id) = coalesce(c1.parent, c1.id)
    AND c2.id = ANY($1::uuid[])
    AND (c1.id = c2.id OR c1.deleted_at IS NULL)
    -- AND c2.deleted_at IS NULL
),
lists AS (
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
  parent AS id,
  display_name,
  sub_contacts,
  extract(epoch FROM created_at) as created_at,
  extract(epoch FROM updated_at) as updated_at,
  extract(epoch FROM deleted_at) as deleted_at,
  parent AS summary,
  lists,
  (array_length(sub_contacts, 1) > 1)::boolean AS merged,
  'contact' as type
FROM
  all_contacts
  LEFT JOIN lists USING (id)
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON id = cid;