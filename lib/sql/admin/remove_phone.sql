WITH t AS (
  UPDATE users
  SET phone_number = NULL
  WHERE phone_number = $1::text
)
DELETE FROM contacts_phone_numbers
WHERE phone_number = $1::text
