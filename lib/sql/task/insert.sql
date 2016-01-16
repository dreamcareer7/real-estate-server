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
        CASE WHEN $4::bigint IS NULL THEN NULL ELSE to_timestamp($4) END
       )
RETURNING id;
