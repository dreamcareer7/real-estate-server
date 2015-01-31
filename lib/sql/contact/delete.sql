DELETE FROM contacts
WHERE
 user_id = $1 AND contact_id = $2
