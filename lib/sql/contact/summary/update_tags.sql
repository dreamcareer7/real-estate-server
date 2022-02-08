WITH ctags AS (
  SELECT
    ca.contact AS id,
    array_agg(ca.text) AS tag
  FROM
    contacts_attributes AS ca
  WHERE
    ca.contact = ANY($1::uuid[])
    AND ca.deleted_at IS NULL
    AND ca.attribute_type = 'tag'
  GROUP BY
    1
), c AS (
  SELECT
    cids.id,
    ctags.tag
  FROM
    unnest($1::uuid[]) AS cids(id)
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

