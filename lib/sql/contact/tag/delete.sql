DELETE FROM
  contacts_attributes AS ca
WHERE
  ca.text ILIKE $2
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
