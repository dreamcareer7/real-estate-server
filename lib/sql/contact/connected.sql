SELECT COUNT(*) AS is_connected
FROM CONTACTS
WHERE "user" = $1 AND
      contact_user = $2
