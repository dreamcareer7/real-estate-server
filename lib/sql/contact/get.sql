WITH all_contacts AS (
  SELECT
    c1.id, c2.id AS parent
  FROM
    contacts c1,
    contacts c2
  WHERE
    coalesce(c2.parent, c2.id) = coalesce(c1.parent, c1.id)
    AND c2.id = ANY($1::uuid[])
    AND c1.deleted_at IS NULL
    AND c2.deleted_at IS NULL
)
SELECT
  parent AS id,
  array_agg(id) AS sub_contacts,
  parent AS summary,
  'contact' as type
FROM
  all_contacts
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON parent = cid
GROUP BY parent