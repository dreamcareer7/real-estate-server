INSERT INTO verifications(code, "user")
    VALUES ($1, $2)
ON CONFLICT ("user") DO UPDATE
    SET code = $1
    WHERE verifications."user" = $2
RETURNING id
