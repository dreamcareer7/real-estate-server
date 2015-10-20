INSERT INTO contacts("user",
                     contact_user,
                     first_name,
                     last_name,
                     phone_number,
                     email)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id
