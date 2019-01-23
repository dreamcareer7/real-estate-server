WITH cids AS (
  DELETE FROM
    contacts_attributes AS ca
  WHERE
    ca.attribute_type = 'tag'
    AND ca.contact = ANY(
      SELECT
        id
      FROM
        contacts
      WHERE
        brand = $1
        AND "user" = $2
    )
  RETURNING
    ca.contact
)
SELECT DISTINCT contact AS id FROM cids
