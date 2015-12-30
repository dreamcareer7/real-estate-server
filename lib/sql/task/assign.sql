INSERT INTO task_contacts (
            "task",
            "contact"
        )
VALUES ($1, $2)
ON CONFLICT DO NOTHING
