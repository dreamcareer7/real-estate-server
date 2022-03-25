WITH ctags AS MATERIALIZED (
  SELECT
    c.id,
    array_agg(ca.text ORDER BY ca.text) FILTER (WHERE ca.text IS NOT NULL) AS tag
  FROM
    contacts AS c
    LEFT JOIN (
      SELECT
        *
      FROM
        contacts_attributes_text
      WHERE
        deleted_at IS NULL
        AND attribute_type = 'tag'
    ) AS ca ON c.id = ca.contact
  WHERE
    c.deleted_at IS NULL
    AND c.brand = $1::uuid
  GROUP BY
    c.id
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
