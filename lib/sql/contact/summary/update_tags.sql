EXPLAIN ANALYZE WITH ctags AS MATERIALIZED (
  SELECT
    c.id,
    array_agg(ca.text ORDER BY ca.text) AS tag
  FROM
    contacts_attributes_text AS ca
    JOIN contacts AS c
      ON c.id = ca.contact
  WHERE
    c.deleted_at IS NULL
    AND ca.deleted_at IS NULL
    AND ca.attribute_type = 'tag'
    AND c.brand = $1::uuid
  GROUP BY
    c.id
), no_tags AS (
  SELECT
    id
  FROM
    contacts AS c
  WHERE
    c.deleted_at IS NULL
    AND c.brand = $1::uuid

  EXCEPT

  SELECT
    id
  FROM
    ctags
), update_no_tags AS (
  UPDATE
    contacts
  SET
    tag = NULL,
    tag_searchable = NULL
  FROM
    no_tags
  WHERE
    contacts.id = no_tags.id
    AND tag IS NOT NULL
)
UPDATE
  contacts
SET
  tag = c.tag,
  tag_searchable = lower(c.tag::text)::text[]
FROM
  ctags AS c
WHERE
  contacts.id = c.id
  AND contacts.tag IS DISTINCT FROM c.tag
  AND brand = $1::uuid
  AND deleted_at IS NULL
