UPDATE contacts_phone_numbers
SET deleted_at = NOW()
WHERE contact = $1 AND
      id = $2
