INSERT INTO distribution_lists
    (email, first_name, last_name, title, city, state, postal_code, country, phone)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id
