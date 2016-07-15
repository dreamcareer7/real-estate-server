SELECT COALESCE(BOOL_OR(LOWER(contacts.email) = LOWER($3::text)), FALSE) OR
       COALESCE(BOOL_OR(contacts.phone_number = $4::text), FALSE) OR
       COALESCE(BOOL_OR(contacts.contact_user = $2::uuid), FALSE) AS is_dup
FROM contacts
WHERE contacts."user" = $1
