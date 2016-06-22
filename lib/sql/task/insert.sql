INSERT INTO
    tasks
    (
      "user",
      title,
      "transaction",
      due_date,
      private,
      expense,
      google_id
    )
VALUES (
         $1,
         $2,
         $3,
         CASE WHEN $4::float IS NULL THEN NULL ELSE to_timestamp($4::float) END,
         $5,
         $6,
         $7
       )
RETURNING id;
