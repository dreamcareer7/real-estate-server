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


-- UPDATE
--   contacts_attributes AS ca
-- SET
--   deleted_at = NOW()
-- FROM
--   contacts AS c
-- WHERE
--   c.brand = $1
--   AND ca.contact = c.id
--   AND ca.text ILIKE $2
-- RETURNING
--   ca.contact
