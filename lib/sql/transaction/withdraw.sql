DELETE FROM transaction_contacts
WHERE "transaction" = $1 AND
      contact = $2
