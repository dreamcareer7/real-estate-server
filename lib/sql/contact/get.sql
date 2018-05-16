WITH all_contacts AS (
  SELECT
    c1.id,
    c2.id AS parent,
    c1.searchable_field,
    array_agg(c1.id) OVER (PARTITION BY c2.id) AS sub_contacts,
    first_value(c1.created_at) OVER (PARTITION BY c2.id ORDER BY c1.created_at) AS created_at,
    last_value (c1.updated_at) OVER (PARTITION BY c2.id ORDER BY c1.updated_at) AS updated_at
  FROM
    contacts c1,
    contacts c2
  WHERE
    coalesce(c2.parent, c2.id) = coalesce(c1.parent, c1.id)
    AND c2.id = ANY($1::uuid[])
    AND (c1.id = c2.id OR c1.deleted_at IS NULL)
    -- AND c2.deleted_at IS NULL
)
SELECT
  parent AS id,
  sub_contacts,
  extract(epoch FROM created_at) as created_at,
  extract(epoch FROM updated_at) as updated_at,
  parent AS summary,
  'contact' as type
FROM
  all_contacts
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON id = cid;