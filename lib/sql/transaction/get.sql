SELECT 'transaction' AS TYPE,
       *,
       (
         SELECT JSON_AGG
         (
           JSON_BUILD_OBJECT
           (
             'type', 'role',
             'contact', contact,
             'role_types',
             (
               SELECT JSON_AGG(role)
               FROM transaction_contact_roles
               WHERE transaction_contact = transaction_contacts.id
             )
           )
         )
         FROM transaction_contacts
         WHERE transaction = $1
       ) AS roles,
       (
        SELECT ARRAY_AGG(id)
        FROM important_dates
        WHERE "transaction" = $1 AND
        deleted_at IS NULL
       ) AS important_dates,
       (
         SELECT ARRAY_AGG(attachment)
         FROM attachments_eav
         INNER JOIN attachments
           ON attachments_eav.attachment = attachments.id
         WHERE object = $1 AND
         (
           CASE WHEN attachments.private IS TRUE THEN attachments."user" = $2 ELSE TRUE END
         ) AND
         deleted_at IS NULL
       ) AS attachments,
       (
         SELECT ARRAY_AGG(id)
         FROM tasks
         WHERE transaction = $1 AND
         CASE WHEN private IS TRUE THEN "user" = $2 ELSE TRUE END AND
         deleted_at IS NULL
       ) AS tasks,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM transactions
WHERE id = $1
LIMIT 1
