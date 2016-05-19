SELECT contacts.id
FROM contacts
INNER JOIN tags
ON contacts.id = tags.entity
WHERE contacts.deleted_at IS NULL AND
      CASE WHEN $3::uuid IS NULL THEN FALSE ELSE contacts."user" = $3 END AND
      tags.type = $1 AND
      tags."user" = $3 AND
      tags.tag =ANY($2::text[])
