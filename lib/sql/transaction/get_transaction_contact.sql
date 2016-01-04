SELECT id FROM transaction_contacts
WHERE transaction = $1
AND contact = $2
LIMIT 1
