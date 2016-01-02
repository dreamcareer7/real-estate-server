INSERT INTO transaction_contact_roles(transaction_contact, role)
    VALUES ($1, $2)
ON CONFLICT DO NOTHING
