SELECT 'transaction' AS TYPE,
       *,
       (
        SELECT ARRAY_AGG(contact)
        FROM transaction_contacts
        WHERE "transaction" = $1
       ) AS contacts,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM transactions
WHERE id = $1
LIMIT 1
