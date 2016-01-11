SELECT 'transaction' AS TYPE,
       *,
       (
        SELECT ARRAY_AGG(contact)
        FROM transaction_contacts
        WHERE "transaction" = $1
       ) AS contacts,
       (
        SELECT ARRAY_AGG(id)
        FROM important_dates
        WHERE "transaction" = $1 AND
        deleted_at IS NULL
       ) AS important_dates,
       (
        SELECT ARRAY_AGG(attachment)
        FROM attachments_eav
        WHERE object = $1
       ) AS attachments,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM transactions
WHERE id = $1
LIMIT 1
