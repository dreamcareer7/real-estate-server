SELECT contacts.id
FROM contacts
LEFT JOIN users
ON contacts.contact_user = users.id
WHERE contacts."user" = $1 AND
      contacts.deleted_at IS NULL AND
    (
        contacts.email ~* $2 OR
        contacts.first_name ~* $2 OR
        contacts.last_name ~* $2 OR
        contacts.phone_number ~* $2 OR
        users.first_name ~* $2 OR
        users.last_name ~* $2 OR
        users.phone_number ~* $2 OR
        users.email ~* $2
    )
ORDER BY contacts.first_name
