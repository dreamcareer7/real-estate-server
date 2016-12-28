UPDATE contacts_attributes
SET deleted_at = NOW()
WHERE contact = $1 AND
      id = $2
