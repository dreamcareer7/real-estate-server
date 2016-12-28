UPDATE contacts_emails
SET deleted_at = NOW()
WHERE contact = $1 AND
      id = $2
