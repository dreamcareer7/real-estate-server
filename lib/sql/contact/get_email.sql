SELECT *
FROM contacts_emails
WHERE contact = $1 AND
      id = $2
LIMIT 1
