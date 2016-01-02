SELECT role FROM transaction_contact_roles
WHERE transaction_contact IN(
  SELECT id FROM transaction_contacts
    WHERE  transaction= $1 and contact = $2
)