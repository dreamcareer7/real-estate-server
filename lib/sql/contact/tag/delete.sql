WITH cids AS (
  DELETE FROM
    contacts_attributes AS ca
  WHERE
    lower(ca.text) = ANY($2::text[])
    AND attribute_type = 'tag'
    AND ca.contact = ANY(
      SELECT
        id
      FROM
        contacts
      WHERE
        brand = $1
    )
  RETURNING
    ca.contact
)
SELECT DISTINCT contact AS id FROM cids
