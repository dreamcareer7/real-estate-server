INSERT INTO transaction_contacts (
            "transaction",
            "contact"
        )
VALUES ($1, $2)
ON CONFLICT DO NOTHING
