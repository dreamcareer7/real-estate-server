WITH cids AS (
  DELETE FROM
    contacts_attributes AS ca
  WHERE
    CASE
      WHEN $3::boolean IS TRUE THEN
        ca.text = ANY($2::text[])
      ELSE
        lower(ca.text) = ANY($2::text[])
    END
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
