INSERT INTO docusign_users
("user", access_token, refresh_token, account_id, base_url, first_name, last_name, email)
VALUES
($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT ("user") DO UPDATE SET
  access_token = $2,
  refresh_token = $3,
  account_id = $4,
  base_url = $5,
  first_name = $6,
  last_name = $7,
  email = $8,
  updated_at = NOW()
  WHERE docusign_users."user" = $1
