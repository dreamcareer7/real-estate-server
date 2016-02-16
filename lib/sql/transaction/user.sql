SELECT id
FROM transactions
WHERE (
  "user" = $1 OR
  id IN(
    SELECT transaction FROM transaction_contacts WHERE contact = $1
    )
  )
  AND deleted_at IS NULL
