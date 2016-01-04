DELETE FROM transaction_contact_roles
WHERE transaction_contact = $1 AND role = $2
