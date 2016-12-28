UPDATE contacts_emails
SET email = $3,
    data = $4
WHERE contact = $1 AND
      id = $2
