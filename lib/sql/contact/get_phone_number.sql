SELECT *
FROM contacts_phone_numbers
WHERE contact = $1 AND
      id = $2
LIMIT 1
