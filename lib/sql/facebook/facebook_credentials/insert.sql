INSERT INTO facebook_credentials
    ("user", brand, facebook_id, facebook_email, first_name, last_name, access_token, scope)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT(brand, facebook_id) DO UPDATE SET
facebook_email = $4,
first_name = $5,
last_name = $6,
access_token = $7,
scope = $8,
updated_at = CLOCK_TIMESTAMP()
RETURNING id
