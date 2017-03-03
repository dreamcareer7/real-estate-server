UPDATE contacts_emails
SET deleted_at = CLOCK_TIMESTAMP()
WHERE contact = $1 AND
      id = $2
