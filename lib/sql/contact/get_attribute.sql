SELECT *
FROM contacts_attributes
WHERE contact = $1 AND
      id = $2
LIMIT 1
