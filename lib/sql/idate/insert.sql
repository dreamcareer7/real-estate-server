INSERT INTO
    important_dates(
        "transaction",
        title,
        due_date
    )
VALUES (
        $1,
        $2,
        $3
    ) RETURNING id;
