SELECT id
FROM transactions
WHERE (
  "user" = $1 OR
  id IN(
    SELECT transaction FROM transaction_contacts WHERE contact IN (
      SELECT id FROM contacts WHERE contact_user = $1
    )
  )
)
  AND deleted_at IS NULL
