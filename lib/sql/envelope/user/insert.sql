INSERT INTO docusign_users ("user", access_token, refresh_token, account_id, base_url) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT ("user") DO UPDATE SET
  access_token = $2,
  refresh_token = $3,
  account_id = $4,
  base_url = $5
  WHERE docusign_users."user" = $1
