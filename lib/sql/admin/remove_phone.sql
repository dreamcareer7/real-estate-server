WITH t AS (
  UPDATE users
  SET phone_number = NULL
  WHERE phone_number = $1::text
)
UPDATE contacts
SET phone_number = NULL
WHERE phone_number = $1::text
