WITH ctags AS MATERIALIZED (
  SELECT
    ca.contact AS id,
    array_agg(ca.text ORDER BY ca.text) AS tag
  FROM
    contacts AS c
    LEFT JOIN contacts_attributes_text AS ca ON c.id = ca.contact
  WHERE
    ca.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND c.brand = $1::uuid
    AND ca.attribute_type = 'tag'
  GROUP BY
    ca.contact
  HAVING
    min(c.tag) IS DISTINCT FROM array_agg(ca.text ORDER BY ca.text)
)
UPDATE
  contacts
SET
  tag = c.tag,
  tag_searchable = LOWER(c.tag::text)::text[]
FROM
  ctags AS c
WHERE
  contacts.id = c.id
  AND contacts.tag IS DISTINCT FROM c.tag
