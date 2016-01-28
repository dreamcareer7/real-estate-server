SELECT users.id
FROM transaction_contacts
INNER JOIN contacts
  ON transaction_contacts.contact = contacts.id
INNER JOIN users
  ON contacts.contact_user = users.id
WHERE transaction = $1
UNION SELECT "user"
FROM transactions
WHERE id = $1
