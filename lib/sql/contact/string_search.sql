WITH c AS
(
  SELECT contacts.id AS id,
         (
           SELECT ARRAY_TO_STRING(ARRAY_AGG(contacts_emails.email), ' ')
           FROM contacts_emails
           WHERE contacts_emails.contact = contacts.id AND
                 contacts_emails.deleted_at IS NULL
         ) AS emails,
         (
           SELECT ARRAY_TO_STRING(ARRAY_AGG(contacts_phone_numbers.phone_number), ' ')
           FROM contacts_phone_numbers
           WHERE contacts_phone_numbers.contact = contacts.id AND
                 contacts_phone_numbers.deleted_at IS NULL
         ) AS phone_numbers,
         (
           SELECT ARRAY_TO_STRING(ARRAY_AGG(((contacts_attributes.attribute)->>'first_name')::text || ' ' || ((contacts_attributes.attribute)->>'last_name')::text), ' ')
           FROM contacts_attributes
           WHERE contacts_attributes.contact = contacts.id AND
                 contacts_attributes.attribute_type = 'name' AND
                 contacts_attributes.attribute IS NOT NULL AND
                 contacts_attributes.deleted_at IS NULL
         ) AS names
  FROM contacts
  WHERE contacts."user" = $1 AND
        contacts.deleted_at IS NULL AND
        contacts.merged IS FALSE
)
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM c
WHERE concat_ws
(
  ' ',
  c.emails,
  c.phone_numbers,
  c.names
) ILIKE ALL($2)
LIMIT $3
