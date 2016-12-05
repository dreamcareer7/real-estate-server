SELECT contacts.id,
       (COUNT(*) OVER())::INT AS total
FROM contacts
LEFT JOIN users
  ON contacts.contact_user = users.id
WHERE contacts."user" = $1 AND
      contacts.deleted_at IS NULL AND
      concat_ws(
        ' ',
        contacts.email,
        contacts.first_name,
        contacts.last_name,
        contacts.phone_number,
        contacts.company,
        users.email,
        users.first_name,
        users.last_name,
        users.phone_number
      ) ILIKE ALL($2)
ORDER BY contacts.first_name,
         contacts.last_name,
         contacts.email,
         contacts.phone_number
LIMIT $3
