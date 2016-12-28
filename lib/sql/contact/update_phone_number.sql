UPDATE contacts_phone_numbers
SET phone_number = $3,
    data = $4
WHERE contact = $1 AND
      id = $2
