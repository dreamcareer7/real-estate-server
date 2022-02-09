EXPLAIN ANALYZE WITH cids AS (
  SELECT
    id
  FROM
    contacts
  WHERE
    brand = $1::uuid
    AND deleted_at IS NULL
),
ctags AS (
  SELECT
    ca.contact AS id,
    array_agg(ca.text) AS tag
  FROM
    contacts_attributes_text AS ca
    JOIN cids
      ON cids.id = ca.contact
  WHERE
    ca.deleted_at IS NULL
    AND ca.attribute_type = 'tag'
  GROUP BY
    1
), c AS (
  SELECT
    cids.id,
    ctags.tag
  FROM
    cids
    LEFT JOIN ctags
      ON ctags.id = cids.id
)
UPDATE
  contacts
SET
  tag = c.tag,
  tag_searchable = LOWER(c.tag::text)::text[]
FROM
  c
WHERE
  contacts.id = c.id
