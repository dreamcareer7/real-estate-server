SELECT id,
       'contact' AS type,
       EXTRACT(EPOCH FROM contacts.created_at) AS created_at,
       EXTRACT(EPOCH FROM contacts.updated_at) AS updated_at,
       ios_address_book_id,
       android_address_book_id,
       (
         SELECT ARRAY_AGG(DISTINCT(id)) FROM
         (
           (
             SELECT id
             FROM users
             WHERE email IN
             (
               SELECT DISTINCT(email)
               FROM contacts_emails
               WHERE contact = ANY(refs) AND
                     deleted_at IS NULL
             )
           )
           UNION
           (
             SELECT id
             FROM users
             WHERE phone_number IN
             (
               SELECT DISTINCT(phone_number)
               FROM contacts_phone_numbers
               WHERE contact = ANY(refs) AND
                     deleted_at IS NULL
             )
           )
         ) all_connected
       ) AS users,
       (
         SELECT ARRAY_AGG(DISTINCT((attribute->>'brand')::uuid))
         FROM contacts_attributes
         WHERE contact = ANY(refs) AND
               attribute_type = 'brand' AND
               deleted_at IS NULL
       ) AS brands,
       CASE WHEN COALESCE(ARRAY_LENGTH(refs::uuid[], 1), 0) > 1 THEN TRUE ELSE FALSE END AS merged,
       (
         WITH r AS
         (
           SELECT * FROM UNNEST(contacts.refs) c
         )
         SELECT JSON_AGG(ROW_TO_JSON(sub)) FROM
         (
           SELECT contacts.*,
           'sub_contact' AS type,
           EXTRACT(EPOCH FROM contacts.created_at) AS created_at,
           EXTRACT(EPOCH FROM contacts.updated_at) AS updated_at,
           (
             WITH attrs AS
             (
               SELECT attribute_type AS key, JSON_AGG
               (
                 COALESCE(attribute, '{}'::jsonb) || JSONB_BUILD_OBJECT
                 (
                   'id', id,
                   'type', attribute_type,
                   'created_at', EXTRACT(EPOCH FROM created_at),
                   'updated_at', EXTRACT(EPOCH FROM updated_at)
                 ) ORDER BY created_at
               ) AS value
               FROM contacts_attributes
               WHERE attribute_type <> 'brand' AND
                     contact = r.c AND
                     deleted_at IS NULL
               GROUP BY attribute_type
             )
             SELECT json_object_agg(key, value)
             FROM attrs
           ) AS attributes,
           (
             SELECT JSON_AGG
             (
               COALESCE(data, '{}'::jsonb) || JSONB_BUILD_OBJECT
               (
                 'id', id,
                 'type', 'email',
                 'email', email,
                 'created_at', EXTRACT(EPOCH FROM created_at),
                 'updated_at', EXTRACT(EPOCH FROM updated_at)
               ) ORDER BY created_at
             )
             FROM contacts_emails
             WHERE contact = r.c AND
                   deleted_at IS NULL
           ) AS emails,
           (
             SELECT JSON_AGG
             (
               COALESCE(data, '{}'::jsonb) || JSONB_BUILD_OBJECT
               (
                 'id', id,
                 'type', 'phone_number',
                 'phone_number', phone_number,
                 'created_at', EXTRACT(EPOCH FROM created_at),
                 'updated_at', EXTRACT(EPOCH FROM updated_at)
               ) ORDER BY created_at
             )
             FROM contacts_phone_numbers
             WHERE contact = r.c AND
                   deleted_at IS NULL
           ) AS phone_numbers
           FROM r
           INNER JOIN contacts
           ON r.c = contacts.id
         ) sub
       ) AS sub_contacts
FROM contacts
JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON contacts.id = cid
ORDER BY t.ord
