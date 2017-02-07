WITH c AS
(
  SELECT id
  FROM contacts
  WHERE "user" = $1 AND
        deleted_at IS NULL
),
ce AS
(
  SELECT contact
  FROM contacts_emails
  WHERE contact IN (SELECT id FROM c) AND
        email = $2 AND
        deleted_at IS NULL
),
cp AS
(
  SELECT contact
  FROM contacts_phone_numbers
  WHERE contact IN (SELECT id FROM c) AND
        phone_number = $3 AND
        deleted_at IS NULL
)
SELECT DISTINCT(contact) FROM
(
  SELECT contact FROM ce
  UNION ALL
  SELECT contact FROM cp
) p
