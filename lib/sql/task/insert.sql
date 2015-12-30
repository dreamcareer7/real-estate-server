INSERT INTO
    tasks(
        "user",
        title,
        "transaction",
        due_date
    )
VALUES (
        $1,
        $2,
        $3,
        $4
       )
RETURNING id;
