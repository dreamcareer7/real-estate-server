UPDATE contacts_attributes
SET deleted_at = now()
WHERE contact = $1 AND
      id = $2
