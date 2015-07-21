INSERT INTO password_recovery_records(email, "user", token)
VALUES (LOWER($1), $2, $3)
